// COPG-VD prop_hook engine - clean-room, Apache-2.0. See the header. Written from the public
// bionic property API (<sys/system_properties.h>) and the public prop_info layout; no code from
// any GPL project was used.
#include "prop_virtualizer.hpp"

#include <sys/mman.h>
#include <sys/system_properties.h>
#include <fcntl.h>
#include <unistd.h>

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <vector>

namespace copgvd::propvirt {
namespace {

constexpr size_t kValueMax = 92;      // PROP_VALUE_MAX

struct Region {
    uintptr_t start = 0, end = 0;
    int prot = 0;
    uint64_t offset = 0;
    std::string path;
    bool remapped = false;
};

// Prop name -> spoofed value from the Build fields, for the identity/version props apps and
// attestation read natively. Suffix matches cover the per-partition variants. Empty = no override.
std::string overrideFor(const char* raw, const std::map<std::string, std::string>& v) {
    const std::string name(raw);
    auto get = [&](const char* k) -> std::string {
        auto it = v.find(k);
        return it == v.end() ? std::string() : it->second;
    };
    auto ends = [&](const char* s) {
        const size_t n = strlen(s);
        return name.size() >= n && name.compare(name.size() - n, n, s) == 0;
    };
    if (ends(".build.fingerprint"))        return get("FINGERPRINT");
    if (ends(".build.id") || name == "ro.build.id") return get("ID");
    if (ends(".security_patch"))           return get("SECURITY_PATCH");
    if (ends("api_level"))                 return get("FIRST_API_LEVEL");
    if (ends(".brand"))                    return get("BRAND");
    if (ends(".model"))                    return get("MODEL");
    if (ends(".device"))                   return get("DEVICE");
    if (ends(".product.name") || ends(".build.product")) return get("PRODUCT");
    if (ends(".manufacturer"))             return get("MANUFACTURER");
    if (ends(".build.version.release"))    return get("ANDROID_VERSION");
    if (ends(".build.version.incremental")) return get("INCREMENTAL");
    return std::string();
}

struct Target { const prop_info* pi; std::string value; };
struct Ctx { const std::map<std::string, std::string>* values; std::vector<Target>* targets; };
struct Inner { Ctx* ctx; const prop_info* pi; };

}  // namespace

bool install(const std::map<std::string, std::string>& values) {
    // 1. this process's /dev/__properties__ mappings
    std::vector<Region> regions;
    FILE* f = fopen("/proc/self/maps", "r");
    if (!f) return false;
    char line[512];
    while (fgets(line, sizeof(line), f)) {
        uintptr_t s = 0, e = 0;
        char perms[5] = {}, dev[16] = {}, path[256] = {};
        unsigned long off = 0, ino = 0;
        if (sscanf(line, "%zx-%zx %4s %lx %15s %lu %255[^\n]", &s, &e, perms, &off, dev, &ino, path) >= 7) {
            std::string p(path);
            const size_t q = p.find_first_not_of(' ');
            p = (q == std::string::npos) ? std::string() : p.substr(q);
            if (p.rfind("/dev/__properties__/", 0) == 0) {
                int prot = 0;
                if (perms[0] == 'r') prot |= PROT_READ;
                if (perms[1] == 'w') prot |= PROT_WRITE;
                if (perms[2] == 'x') prot |= PROT_EXEC;
                regions.push_back({s, e, prot, off, std::move(p), false});
            }
        }
    }
    fclose(f);
    if (regions.empty()) return false;

    // 2. enumerate properties, collect the ones we override
    std::vector<Target> targets;
    Ctx ctx{&values, &targets};
    __system_property_foreach([](const prop_info* pi, void* c) {
        Inner inner{static_cast<Ctx*>(c), pi};
        __system_property_read_callback(pi, [](void* cc, const char* name, const char*, uint32_t) {
            Inner* in = static_cast<Inner*>(cc);
            std::string ov = overrideFor(name, *in->ctx->values);
            if (!ov.empty() && ov.size() < kValueMax)
                in->ctx->targets->push_back({in->pi, std::move(ov)});
        }, &inner);
    }, &ctx);
    if (targets.empty()) return false;

    // 3. remap each affected area MAP_PRIVATE (process-local copy of its backing file) and patch
    //    the inline value. prop_info = { uint32_t serial; char value[92]; char name[]; } for the
    //    short props we handle (all of ours fit in 91 bytes); long props are left untouched.
    for (auto& t : targets) {
        const uintptr_t a = reinterpret_cast<uintptr_t>(t.pi);
        Region* r = nullptr;
        for (auto& rg : regions)
            if (a >= rg.start && a < rg.end) { r = &rg; break; }
        if (!r) continue;
        if (!r->remapped) {
            const int fd = open(r->path.c_str(), O_RDONLY | O_CLOEXEC);
            if (fd < 0) continue;
            void* m = mmap(reinterpret_cast<void*>(r->start), r->end - r->start,
                           PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_FIXED, fd, r->offset);
            close(fd);
            if (m == MAP_FAILED) continue;
            r->remapped = true;
        } else if (mprotect(reinterpret_cast<void*>(r->start), r->end - r->start,
                            PROT_READ | PROT_WRITE) != 0) {
            continue;
        }
        char* value = reinterpret_cast<char*>(a) + sizeof(uint32_t);
        memset(value, 0, kValueMax);
        memcpy(value, t.value.c_str(), t.value.size());
    }

    // 4. restore the original protection on every remapped area
    for (auto& rg : regions)
        if (rg.remapped)
            mprotect(reinterpret_cast<void*>(rg.start), rg.end - rg.start, rg.prot);
    return true;
}

}  // namespace copgvd::propvirt
