// merged_spoof_prop_detection.cpp
// ادغام: SpoofModule + property hooks + file/exec/read detection hooks
// هدف: تشخیص اینکه بازی از کجا "model"/"product" رو می‌خونه

#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <unordered_map>
#include <dlfcn.h>
#include <sys/mman.h>
#include <unistd.h>
#include <android/log.h>
#include <mutex>
#include <functional>
#include <sys/stat.h>
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <cerrno>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <vector>

using json = nlohmann::json;

#define LOG_TAG "SpoofModule"
#define LOGD(...) if (debug_mode) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define PD_LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, "PropDetect", __VA_ARGS__)
#define PD_LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "PropDetect", __VA_ARGS__)

static bool debug_mode = true; // برای تست لاگ بذار true باشه

#ifndef PROP_VALUE_MAX
#define PROP_VALUE_MAX 92
#endif
#ifndef PROP_NAME_MAX
#define PROP_NAME_MAX 32
#endif

struct DeviceInfo {
    std::string brand;
    std::string device;
    std::string manufacturer;
    std::string model;
    std::string fingerprint;
    std::string product;
};

static DeviceInfo current_info;
static std::mutex info_mutex;
static jclass buildClass = nullptr;
static jfieldID modelField = nullptr;
static jfieldID brandField = nullptr;
static jfieldID deviceField = nullptr;
static jfieldID manufacturerField = nullptr;
static jfieldID fingerprintField = nullptr;
static jfieldID productField = nullptr;
static std::once_flag build_once;

static time_t last_config_mtime = 0;
static const std::string config_path = "/data/adb/modules/COPG/config.json";

struct JniString {
    JNIEnv* env;
    jstring jstr;
    const char* chars;
    JniString(JNIEnv* e, jstring s) : env(e), jstr(s), chars(nullptr) {
        if (jstr) chars = env->GetStringUTFChars(jstr, nullptr);
    }
    ~JniString() {
        if (jstr && chars) env->ReleaseStringUTFChars(jstr, chars);
    }
    const char* get() const { return chars; }
};

// ---------------- exec capture helper ----------------
static std::string exec_capture(const std::string &cmd) {
    std::string result;
    FILE* pipe = popen(cmd.c_str(), "r");
    if (!pipe) {
        result = "popen failed";
        return result;
    }
    char buffer[256];
    while (fgets(buffer, sizeof(buffer), pipe)) {
        result += buffer;
    }
    int rc = pclose(pipe);
    result += "\nexit_code=" + std::to_string(rc);
    return result;
}

// ---------------- property hooks ----------------
using fn_property_get = int(*)(const char *key, char *value, const char *def);
using fn___system_property_get = int(*)(const char *name, char *value);

static fn_property_get real_property_get = nullptr;
static fn___system_property_get real___system_property_get = nullptr;

static bool check_and_fill_spoof(const char* key, char* out_value, size_t out_len) {
    if (!key || !out_value || out_len == 0) return false;
    std::string skey(key);
    std::lock_guard<std::mutex> lock(info_mutex);
    if (current_info.model.empty() && current_info.brand.empty() && current_info.device.empty()
        && current_info.manufacturer.empty() && current_info.fingerprint.empty() && current_info.product.empty()) {
        return false;
    }
    if (skey.find("model") != std::string::npos || skey.find("product") != std::string::npos) {
        // اگر شامل model/product بود، از current_info استفاده کن (اولویت model->product)
        if (!current_info.model.empty()) {
            strncpy(out_value, current_info.model.c_str(), out_len - 1);
            out_value[out_len - 1] = '\0';
            return true;
        } else if (!current_info.product.empty()) {
            strncpy(out_value, current_info.product.c_str(), out_len - 1);
            out_value[out_len - 1] = '\0';
            return true;
        }
    }
    // check specific keys as well
    if (skey == "ro.product.brand") {
        strncpy(out_value, current_info.brand.c_str(), out_len - 1); out_value[out_len - 1] = '\0'; return true;
    }
    if (skey == "ro.build.fingerprint") {
        strncpy(out_value, current_info.fingerprint.c_str(), out_len - 1); out_value[out_len - 1] = '\0'; return true;
    }
    return false;
}

extern "C" int property_get(const char *key, char *value, const char *def) {
    if (!real_property_get) {
        real_property_get = (fn_property_get)dlsym(RTLD_NEXT, "property_get");
        if (!real_property_get && debug_mode) PD_LOGE("real property_get not found via dlsym");
    }
    if (value) {
        if (check_and_fill_spoof(key, value, PROP_VALUE_MAX)) {
            if (debug_mode) PD_LOGD("property_get -> spoofed %s = %s", key, value);
            return (int)strlen(value);
        }
    }
    if (real_property_get) return real_property_get(key, value, def);
    if (value) {
        if (def) { strncpy(value, def, PROP_VALUE_MAX - 1); value[PROP_VALUE_MAX - 1] = '\0'; return (int)strlen(value); }
        value[0] = '\0'; return 0;
    }
    return 0;
}

extern "C" int __system_property_get(const char *name, char *value) {
    if (!real___system_property_get) {
        real___system_property_get = (fn___system_property_get)dlsym(RTLD_NEXT, "__system_property_get");
        if (!real___system_property_get && debug_mode) PD_LOGE("real __system_property_get not found via dlsym");
    }
    if (value) {
        if (check_and_fill_spoof(name, value, PROP_VALUE_MAX)) {
            if (debug_mode) PD_LOGD("__system_property_get -> spoofed %s = %s", name, value);
            return (int)strlen(value);
        }
    }
    if (real___system_property_get) return real___system_property_get(name, value);
    if (value) { value[0] = '\0'; }
    return 0;
}

// ---------------- detection hooks for files/exec/read ----------------

// helpers
static bool path_likely_buildprop_or_cpu(const char* path) {
    if (!path) return false;
    std::string p(path);
    if (p.find("build.prop") != std::string::npos) return true;
    if (p.find("/proc/cpuinfo") != std::string::npos) return true;
    // add other suspicious files if needed
    return false;
}

static std::string fd_to_path(int fd) {
    char linkpath[64];
    snprintf(linkpath, sizeof(linkpath), "/proc/self/fd/%d", fd);
    char buf[PATH_MAX];
    ssize_t len = readlink(linkpath, buf, sizeof(buf) - 1);
    if (len <= 0) return std::string();
    buf[len] = '\0';
    return std::string(buf);
}

// dlsym originals (lazy)
using fn_open = int(*)(const char*, int, ...);
using fn_openat = int(*)(int, const char*, int, ...);
using fn_fopen = FILE*(*)(const char*, const char*);
using fn_fopen64 = FILE*(*)(const char*, const char*);
using fn_read = ssize_t(*)(int, void*, size_t);
using fn_pread = ssize_t(*)(int, void*, size_t, off_t);
using fn_execve = int(*)(const char*, char* const[], char* const[]);
using fn_popen = FILE*(*)(const char*, const char*);

static fn_open real_open = nullptr;
static fn_openat real_openat = nullptr;
static fn_fopen real_fopen = nullptr;
static fn_fopen64 real_fopen64 = nullptr;
static fn_read real_read = nullptr;
static fn_pread real_pread = nullptr;
static fn_execve real_execve = nullptr;
static fn_popen real_popen = nullptr;

extern "C" int open(const char* pathname, int flags, ...) {
    if (!real_open) real_open = (fn_open)dlsym(RTLD_NEXT, "open");
    if (pathname && debug_mode && path_likely_buildprop_or_cpu(pathname)) {
        PD_LOGD("open called for path: %s", pathname);
    }
    // forward
    va_list ap;
    va_start(ap, flags);
    mode_t mode = 0;
    if (flags & O_CREAT) mode = va_arg(ap, int);
    va_end(ap);
    return real_open ? real_open(pathname, flags, mode) : -1;
}

extern "C" int openat(int dirfd, const char* pathname, int flags, ...) {
    if (!real_openat) real_openat = (fn_openat)dlsym(RTLD_NEXT, "openat");
    if (pathname && debug_mode && path_likely_buildprop_or_cpu(pathname)) {
        PD_LOGD("openat called for path: %s", pathname);
    }
    va_list ap;
    va_start(ap, flags);
    mode_t mode = 0;
    if (flags & O_CREAT) mode = va_arg(ap, int);
    va_end(ap);
    return real_openat ? real_openat(dirfd, pathname, flags, mode) : -1;
}

extern "C" FILE* fopen(const char* pathname, const char* mode) {
    if (!real_fopen) real_fopen = (fn_fopen)dlsym(RTLD_NEXT, "fopen");
    if (pathname && debug_mode && path_likely_buildprop_or_cpu(pathname)) {
        PD_LOGD("fopen called for path: %s", pathname);
    }
    return real_fopen ? real_fopen(pathname, mode) : nullptr;
}

extern "C" FILE* fopen64(const char* pathname, const char* mode) {
    if (!real_fopen64) real_fopen64 = (fn_fopen64)dlsym(RTLD_NEXT, "fopen64");
    if (pathname && debug_mode && path_likely_buildprop_or_cpu(pathname)) {
        PD_LOGD("fopen64 called for path: %s", pathname);
    }
    return real_fopen64 ? real_fopen64(pathname, mode) : nullptr;
}

extern "C" ssize_t read(int fd, void* buf, size_t count) {
    if (!real_read) real_read = (fn_read)dlsym(RTLD_NEXT, "read");
    ssize_t ret = real_read ? real_read(fd, buf, count) : -1;
    if (ret > 0 && debug_mode) {
        std::string path = fd_to_path(fd);
        if (!path.empty() && path_likely_buildprop_or_cpu(path.c_str())) {
            // check content for model/product keys
            std::string data((char*)buf, (size_t)ret);
            if (data.find("ro.product.model") != std::string::npos ||
                data.find("ro.product.product") != std::string::npos ||
                data.find("model") != std::string::npos ||
                data.find("product") != std::string::npos) {
                PD_LOGD("read(fd=%d -> %s) returned %zd bytes and contains product/model text", fd, path.c_str(), ret);
                // for debug, print a small excerpt
                std::string excerpt = data.substr(0, std::min((size_t)256, data.size()));
                PD_LOGD("read excerpt: %s", excerpt.c_str());
            } else {
                PD_LOGD("read(fd=%d -> %s) returned %zd bytes (no product/model found)", fd, path.c_str(), ret);
            }
        }
    }
    return ret;
}

extern "C" ssize_t pread(int fd, void* buf, size_t count, off_t offset) {
    if (!real_pread) real_pread = (fn_pread)dlsym(RTLD_NEXT, "pread");
    ssize_t ret = real_pread ? real_pread(fd, buf, count, offset) : -1;
    if (ret > 0 && debug_mode) {
        std::string path = fd_to_path(fd);
        if (!path.empty() && path_likely_buildprop_or_cpu(path.c_str())) {
            std::string data((char*)buf, (size_t)ret);
            if (data.find("ro.product.model") != std::string::npos ||
                data.find("ro.product.product") != std::string::npos ||
                data.find("model") != std::string::npos ||
                data.find("product") != std::string::npos) {
                PD_LOGD("pread(fd=%d -> %s) returned %zd bytes and contains product/model text", fd, path.c_str(), ret);
                std::string excerpt = data.substr(0, std::min((size_t)256, data.size()));
                PD_LOGD("pread excerpt: %s", excerpt.c_str());
            } else {
                PD_LOGD("pread(fd=%d -> %s) returned %zd bytes (no product/model found)", fd, path.c_str(), ret);
            }
        }
    }
    return ret;
}

extern "C" int execve(const char* filename, char* const argv[], char* const envp[]) {
    if (!real_execve) real_execve = (fn_execve)dlsym(RTLD_NEXT, "execve");
    if (filename && debug_mode) {
        std::string f(filename);
        // detect getprop or resetprop usage
        if (f.find("getprop") != std::string::npos || f.find("resetprop") != std::string::npos) {
            PD_LOGD("execve called for: %s", filename);
            // print args
            std::string args;
            for (int i = 0; argv && argv[i]; ++i) {
                args += argv[i];
                args += " ";
            }
            PD_LOGD("execve args: %s", args.c_str());
        }
    }
    return real_execve ? real_execve(filename, argv, envp) : -1;
}

extern "C" FILE* popen(const char* command, const char* type) {
    if (!real_popen) real_popen = (fn_popen)dlsym(RTLD_NEXT, "popen");
    if (command && debug_mode) {
        std::string cmd(command);
        if (cmd.find("getprop") != std::string::npos || cmd.find("resetprop") != std::string::npos) {
            PD_LOGD("popen called with command: %s", command);
        }
    }
    return real_popen ? real_popen(command, type) : nullptr;
}

// ---------------- original SpoofModule (unchanged except debug_mode true) ----------------
class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        LOGD("Module loaded successfully");

        ensureBuildClass();
        reloadIfNeeded(true);

        // warm-resolve originals for debug
        if (debug_mode) {
            real_property_get = (fn_property_get)dlsym(RTLD_NEXT, "property_get");
            real___system_property_get = (fn___system_property_get)dlsym(RTLD_NEXT, "__system_property_get");
            PD_LOGD("dlsym property_get=%p __system_property_get=%p", (void*)real_property_get, (void*)real___system_property_get);
        }
    }

    void onUnload() {
        std::lock_guard<std::mutex> lock(info_mutex);
        if (buildClass) {
            env->DeleteGlobalRef(buildClass);
            buildClass = nullptr;
            LOGD("Global ref for Build class released");
        }
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) {
            LOGD("No package name provided, closing module");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        JniString pkg(env, args->nice_name);
        const char* package_name = pkg.get();
        if (!package_name) {
            LOGE("Failed to get package name");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        LOGD("Processing package: %s", package_name);

        reloadIfNeeded(false);

        bool should_close = true;
        {
            std::lock_guard<std::mutex> lock(info_mutex);
            auto it = package_map.find(package_name);
            if (it != package_map.end()) {
                current_info = it->second;
                LOGD("Spoofing device for package %s: %s", package_name, current_info.model.c_str());

                // Set Java Build.* fields
                spoofDevice(current_info);

                // property_get and __system_property_get hooks will use current_info
                should_close = false;
            }
        }

        if (should_close) {
            LOGD("Package %s not found in config, closing module", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            LOGD("Set DLCLOSE after spoofing for stealth");
        }
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name || package_map.empty()) return;

        ensureBuildClass();
        if (!buildClass) {
            LOGE("Build class not initialized, skipping postAppSpecialize");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        JniString pkg(env, args->nice_name);
        const char* package_name = pkg.get();
        if (!package_name) {
            LOGE("Failed to get package name in postAppSpecialize");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        {
            std::lock_guard<std::mutex> lock(info_mutex);
            auto it = package_map.find(package_name);
            if (it != package_map.end()) {
                current_info = it->second;
                LOGD("Post-specialize spoofing for %s: %s", package_name, current_info.model.c_str());
                spoofDevice(current_info);
            }
        }

        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        LOGD("Set DLCLOSE in postAppSpecialize for extra stealth");
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;

    void ensureBuildClass() {
        std::call_once(build_once, [&] {
            jclass localBuild = env->FindClass("android/os/Build");
            if (!localBuild || env->ExceptionCheck()) {
                env->ExceptionClear();
                LOGE("Failed to find android/os/Build class");
                return;
            }

            buildClass = static_cast<jclass>(env->NewGlobalRef(localBuild));
            env->DeleteLocalRef(localBuild);
            if (!buildClass) {
                LOGE("Failed to create global reference for Build class");
                return;
            }

            modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
            brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
            deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
            manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
            fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
            productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");

            if (env->ExceptionCheck() || !modelField || !brandField || !deviceField ||
                !manufacturerField || !fingerprintField || !productField) {
                env->ExceptionClear();
                LOGE("Failed to get field IDs for Build class");
                env->DeleteGlobalRef(buildClass);
                buildClass = nullptr;
            }
        });
    }

    void reloadIfNeeded(bool force = false) {
        struct stat file_stat;
        if (stat(config_path.c_str(), &file_stat) != 0) {
            LOGE("Failed to stat config file: %s", strerror(errno));
            return;
        }

        time_t current_mtime = file_stat.st_mtime;
        if (!force && current_mtime == last_config_mtime) {
            LOGD("Config unchanged, skipping reload");
            return;
        }

        LOGD("Config changed or force load, reloading...");

        std::ifstream file(config_path);
        if (!file.is_open()) {
            LOGE("Failed to open config.json at %s", config_path.c_str());
            return;
        }
        LOGD("Config file opened successfully");

        try {
            json config = json::parse(file);
            std::unordered_map<std::string, DeviceInfo> new_map;

            for (auto& [key, value] : config.items()) {
                if (key.find("PACKAGES_") != 0 || key.rfind("_DEVICE") == (key.size() - 7)) continue;
                if (!value.is_array()) {
                    LOGE("Invalid package list for key %s", key.c_str());
                    continue;
                }
                auto packages = value.get<std::vector<std::string>>();
                std::string device_key = key + "_DEVICE";
                if (!config.contains(device_key) || !config[device_key].is_object()) {
                    LOGE("No valid device info for key %s", key.c_str());
                    continue;
                }
                auto device = config[device_key];

                DeviceInfo info;
                info.brand = device.value("BRAND", "generic");
                info.device = device.value("DEVICE", "generic");
                info.manufacturer = device.value("MANUFACTURER", "generic");
                info.model = device.value("MODEL", "generic");
                info.fingerprint = device.value("FINGERPRINT", "generic/brand/device:13/TQ3A.230805.001/123456:user/release-keys");
                info.product = device.value("PRODUCT", info.brand);

                for (const auto& pkg : packages) {
                    new_map[pkg] = info;
                    LOGD("Loaded package %s with model %s", pkg.c_str(), info.model.c_str());
                }
            }

            {
                std::lock_guard<std::mutex> lock(info_mutex);
                package_map = std::move(new_map);
            }

            last_config_mtime = current_mtime;
            LOGD("Config reloaded with %zu packages", package_map.size());
        } catch (const json::exception& e) {
            LOGE("JSON parsing error: %s", e.what());
        } catch (const std::exception& e) {
            LOGE("Error loading config: %s", e.what());
        }
        file.close();
    }

    void spoofDevice(const DeviceInfo& info) {
        if (!buildClass) {
            LOGE("Build class is not initialized!");
            return;
        }

        LOGD("Spoofing device: %s", info.model.c_str());
        auto setStr = [&](jfieldID field, const std::string& value) {
            if (!field) return;
            jstring js = env->NewStringUTF(value.c_str());
            if (!js || env->ExceptionCheck()) {
                env->ExceptionClear();
                LOGE("Failed to create string for field");
                return;
            }
            env->SetStaticObjectField(buildClass, field, js);
            env->DeleteLocalRef(js);
            if (env->ExceptionCheck()) {
                env->ExceptionClear();
                LOGE("Failed to set field");
            }
        };

        setStr(modelField, info.model);
        setStr(brandField, info.brand);
        setStr(deviceField, info.device);
        setStr(manufacturerField, info.manufacturer);
        setStr(fingerprintField, info.fingerprint);
        setStr(productField, info.product);
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
