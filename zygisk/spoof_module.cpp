#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <map>
#include <vector>
#include <iterator>
#include <fstream>
#include <android/log.h>
#include <algorithm>
#include <cctype>

// jsmn in strict mode: a real JSON validator in ~470 lines, instead of nlohmann's 25k-line
// header being instantiated inside zygote to read a flat object. Any parse error yields an
// empty config, and an empty config spoofs nothing - the same fail-closed behaviour as before.
#define JSMN_STATIC
#define JSMN_STRICT
#include "jsmn.h"

#define LOG_TAG "COPG-VD"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define ERROR_LOG(...) LOGE("[ERROR] " __VA_ARGS__)

static const std::string config_file = "/data/adb/COPG-VD.json";
// What the ROM really is. NEVER a system property: the module rewrites those very props, so
// asking the system would be asking our own lie. /build.prop does not exist on these devices;
// on a custom ROM the fingerprint line inside this file is stale, but ro.build.version.* is good.
static const std::string rom_prop_file = "/system/build.prop";
static const std::string version_policy_file = "/data/adb/modules/COPG-VD/.spoof.version";

// The Android version belongs to the ROM, not to the build being spoofed. An app told the SDK
// is newer than the framework really is calls APIs that do not exist: Google's apps crash, the
// device reboots, and it repeats - a softloop, which leaves nothing in the boot logs.
//   Never = the version group is never applied (default)
//   Rom   = only what does not exceed the ROM (in practice, lowering the SDK)
//   Force = whatever the config says
enum class VersionPolicy { Never, Rom, Force };

struct RomVersion {
    std::string release;
    std::string codename;
    int sdk = 0;
};

struct DeviceInfo {
    std::string brand;
    std::string device;
    std::string manufacturer;
    std::string model;
    std::string fingerprint;
    std::string product;
    std::string android_version;
    int version_sdk_int = 0;
    std::string board;
    std::string bootloader;
    std::string hardware;
    std::string id;
    std::string display;
    std::string host;
    std::string odm_sku;
    std::string sku;
    std::string user;
    int64_t time = 0;
    std::string version_incremental;
    std::string version_sdk;
    int version_sdk_int_full = 0;
    std::string version_security_patch;
    std::string version_release_or_codename;
    std::string version_release_or_preview_display;
    std::string version_codename;
};

static inline std::string trim(const std::string& str) {
    auto start = std::find_if_not(str.begin(), str.end(), [](unsigned char c) { 
        return std::isspace(c); 
    });
    auto end = std::find_if_not(str.rbegin(), str.rend(), [](unsigned char c) { 
        return std::isspace(c); 
    }).base();
    return (start < end) ? std::string(start, end) : std::string();
}

static RomVersion readRomVersion() {
    RomVersion rom;
    std::ifstream file(rom_prop_file);
    if (!file.is_open()) return rom;                 // unknown ROM -> nothing is allowed through
    std::string line;
    while (std::getline(file, line)) {
        auto take = [&line](const char* key, std::string& out) {
            const std::string needle = std::string(key) + "=";
            if (line.rfind(needle, 0) == 0) out = trim(line.substr(needle.size()));
        };
        take("ro.build.version.release", rom.release);
        take("ro.build.version.codename", rom.codename);
        std::string sdk;
        take("ro.build.version.sdk", sdk);
        if (!sdk.empty()) {
            try { rom.sdk = std::stoi(sdk); } catch (const std::exception&) { rom.sdk = 0; }
        }
    }
    return rom;
}

static VersionPolicy readVersionPolicy() {
    std::ifstream file(version_policy_file);
    if (!file.is_open()) return VersionPolicy::Never;
    std::string value;
    std::getline(file, value);
    value = trim(value);
    if (value == "force") return VersionPolicy::Force;
    if (value == "rom") return VersionPolicy::Rom;
    return VersionPolicy::Never;
}

// AOSP: RELEASE_OR_CODENAME = "REL".equals(CODENAME) ? RELEASE : CODENAME. Copying CODENAME
// into it publishes the literal string "REL" where the version number belongs, which is a
// combination no real device reports.
static std::string releaseOrCodename(const std::string& codename, const std::string& release) {
    return (codename.empty() || codename == "REL") ? release : codename;
}

using Config = std::map<std::string, std::string>;

// Index right after token i and its whole subtree (jsmn has no parent links).
static int skipToken(const std::vector<jsmntok_t>& t, int i) {
    int j = i + 1;
    for (int k = 0; k < t[i].size; k++) j = skipToken(t, j);
    return j;
}

static std::string tokenText(const std::string& text, const jsmntok_t& tok) {
    return text.substr(tok.start, tok.end - tok.start);
}

// jsmn, even in strict mode, does not check the comma between object members: with one
// missing it silently gives the previous key two children and drops a pair. The structure
// betrays it, though - a well-formed tree has every object key with exactly one child and
// every scalar with none. Anything else is rejected whole, which is what a JSON parser would
// do, and what "spoof nothing rather than half" requires.
// The one thing the structure cannot show: a comma before the closing brace or bracket.
// jsmn swallows it; a JSON parser rejects it, and so does the module's own analyze - the
// two must agree, or the diagnostic lies about whether the module will spoof.
static bool trailingComma(const std::string& text, const jsmntok_t& tok) {
    int p = tok.end - 2;
    while (p > tok.start && std::isspace(static_cast<unsigned char>(text[p]))) p--;
    return p > tok.start && text[p] == ',';
}

static bool validTree(const std::string& text, const std::vector<jsmntok_t>& t, int i, int& next) {
    const jsmntok_t& tok = t[i];
    if ((tok.type == JSMN_OBJECT || tok.type == JSMN_ARRAY) && tok.size > 0 && trailingComma(text, tok))
        return false;
    if (tok.type == JSMN_OBJECT) {
        int j = i + 1;
        for (int k = 0; k < tok.size; k++) {
            if (j >= static_cast<int>(t.size()) || t[j].type != JSMN_STRING || t[j].size != 1) return false;
            if (j + 1 >= static_cast<int>(t.size())) return false;
            int after;
            if (!validTree(text, t, j + 1, after)) return false;
            j = after;
        }
        next = j;
        return true;
    }
    if (tok.type == JSMN_ARRAY) {
        int j = i + 1;
        for (int k = 0; k < tok.size; k++) {
            int after;
            if (j >= static_cast<int>(t.size()) || !validTree(text, t, j, after)) return false;
            j = after;
        }
        next = j;
        return true;
    }
    if (tok.size != 0) return false;        // a scalar that "owns" children = missing comma
    next = i + 1;
    return true;
}

// The "COPG-VD" object of the config as key -> value. Only string/primitive values are taken;
// nested objects (the settings object, anything else) are skipped whole. Last duplicate wins,
// as the previous parser did. Returns false when the file is missing or not valid JSON.
static bool readConfig(const std::string& path, Config& out) {
    std::ifstream file(path);
    if (!file.is_open()) return false;
    const std::string text((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());

    jsmn_parser parser;
    jsmn_init(&parser);
    const int count = jsmn_parse(&parser, text.data(), text.size(), nullptr, 0);
    if (count <= 0) return false;
    std::vector<jsmntok_t> tokens(static_cast<size_t>(count));
    jsmn_init(&parser);
    if (jsmn_parse(&parser, text.data(), text.size(), tokens.data(), static_cast<unsigned>(count)) < 0)
        return false;
    if (tokens[0].type != JSMN_OBJECT) return false;
    int end = 0;
    if (!validTree(text, tokens, 0, end) || end != count) return false;

    int i = 1;
    for (int k = 0; k < tokens[0].size; k++) {
        const jsmntok_t& key = tokens[i];
        const int valueIndex = i + 1;
        if (key.type == JSMN_STRING && tokenText(text, key) == LOG_TAG
                && tokens[valueIndex].type == JSMN_OBJECT) {
            int p = valueIndex + 1;
            for (int n = 0; n < tokens[valueIndex].size; n++) {
                const jsmntok_t& k2 = tokens[p];
                const jsmntok_t& v2 = tokens[p + 1];
                if (k2.type == JSMN_STRING && (v2.type == JSMN_STRING || v2.type == JSMN_PRIMITIVE)) {
                    out[tokenText(text, k2)] = tokenText(text, v2);
                }
                p = skipToken(tokens, p);
            }
            return true;
        }
        i = skipToken(tokens, i);
    }
    return true;   // valid JSON, just no "COPG-VD" object: nothing to spoof
}

static std::string get(const Config& c, const char* key, const std::string& fallback = "") {
    auto it = c.find(key);
    return it == c.end() ? fallback : it->second;
}

class COPGVDModule : public zygisk::ModuleBase {
private:
    zygisk::Api* api = nullptr;
    JNIEnv* env = nullptr;

    // Value-initialized: setInt/setLong only skip a field when it is 0, so an
    // indeterminate int here would be written straight into Build.TIME.
    DeviceInfo spoof_info{};

    void spoofDevice() {
        jclass buildClass = env->FindClass("android/os/Build");
        if (!buildClass) {
            env->ExceptionClear();
            return;
        }

        auto getField = [this](jclass cls, const char* name, const char* sig) -> jfieldID {
            jfieldID id = env->GetStaticFieldID(cls, name, sig);
            if (env->ExceptionCheck()) env->ExceptionClear();
            return id;
        };

        jfieldID build_modelField = getField(buildClass, "MODEL", "Ljava/lang/String;");
        jfieldID build_brandField = getField(buildClass, "BRAND", "Ljava/lang/String;");
        jfieldID build_deviceField = getField(buildClass, "DEVICE", "Ljava/lang/String;");
        jfieldID build_manufacturerField = getField(buildClass, "MANUFACTURER", "Ljava/lang/String;");
        jfieldID build_fingerprintField = getField(buildClass, "FINGERPRINT", "Ljava/lang/String;");
        jfieldID build_productField = getField(buildClass, "PRODUCT", "Ljava/lang/String;");
        jfieldID build_boardField = getField(buildClass, "BOARD", "Ljava/lang/String;");
        jfieldID build_bootloaderField = getField(buildClass, "BOOTLOADER", "Ljava/lang/String;");
        jfieldID build_hardwareField = getField(buildClass, "HARDWARE", "Ljava/lang/String;");
        jfieldID build_idField = getField(buildClass, "ID", "Ljava/lang/String;");
        jfieldID build_displayField = getField(buildClass, "DISPLAY", "Ljava/lang/String;");
        jfieldID build_hostField = getField(buildClass, "HOST", "Ljava/lang/String;");
        jfieldID build_odm_skuField = getField(buildClass, "ODM_SKU", "Ljava/lang/String;");
        jfieldID build_skuField = getField(buildClass, "SKU", "Ljava/lang/String;");
        jfieldID build_tagsField = getField(buildClass, "TAGS", "Ljava/lang/String;");
        jfieldID build_timeField = getField(buildClass, "TIME", "J");
        jfieldID build_typeField = getField(buildClass, "TYPE", "Ljava/lang/String;");
        jfieldID build_userField = getField(buildClass, "USER", "Ljava/lang/String;");

        jclass versionClass = env->FindClass("android/os/Build$VERSION");
        jfieldID build_version_releaseField = nullptr;
        jfieldID build_version_sdk_intField = nullptr;
        jfieldID build_version_codenameField = nullptr;
        jfieldID build_version_incrementalField = nullptr;
        jfieldID build_version_sdkField = nullptr;
        jfieldID build_version_sdk_int_fullField = nullptr;
        jfieldID build_version_security_patchField = nullptr;
        jfieldID build_version_release_or_codenameField = nullptr;
        jfieldID build_version_release_or_preview_displayField = nullptr;

        if (versionClass) {
            build_version_releaseField = getField(versionClass, "RELEASE", "Ljava/lang/String;");
            build_version_sdk_intField = getField(versionClass, "SDK_INT", "I");
            build_version_codenameField = getField(versionClass, "CODENAME", "Ljava/lang/String;");
            build_version_incrementalField = getField(versionClass, "INCREMENTAL", "Ljava/lang/String;");
            build_version_sdkField = getField(versionClass, "SDK", "Ljava/lang/String;");
            build_version_sdk_int_fullField = getField(versionClass, "SDK_INT_FULL", "I");
            build_version_security_patchField = getField(versionClass, "SECURITY_PATCH", "Ljava/lang/String;");
            build_version_release_or_codenameField = getField(versionClass, "RELEASE_OR_CODENAME", "Ljava/lang/String;");
            build_version_release_or_preview_displayField = getField(versionClass, "RELEASE_OR_PREVIEW_DISPLAY", "Ljava/lang/String;");
        }

        Config device;
        if (!readConfig(config_file, device)) {
            ERROR_LOG("Failed to read or parse: %s", config_file.c_str());
            env->DeleteLocalRef(buildClass);
            if (versionClass) env->DeleteLocalRef(versionClass);
            return;
        }

        try {
            if (!device.empty()) {

                spoof_info.brand = get(device, "BRAND");
                spoof_info.device = get(device, "DEVICE");
                spoof_info.manufacturer = get(device, "MANUFACTURER");
                spoof_info.model = get(device, "MODEL");
                spoof_info.fingerprint = get(device, "FINGERPRINT");
                spoof_info.product = get(device, "PRODUCT");
                spoof_info.board = get(device, "BOARD");
                spoof_info.bootloader = get(device, "BOOTLOADER");
                spoof_info.hardware = get(device, "HARDWARE");
                spoof_info.id = get(device, "ID");
                spoof_info.display = get(device, "DISPLAY");
                spoof_info.host = get(device, "HOST");
                spoof_info.odm_sku = get(device, "ODM_SKU", spoof_info.product);
                spoof_info.sku = get(device, "SKU", spoof_info.hardware);
                spoof_info.user = get(device, "USER");
                spoof_info.version_incremental = get(device, "INCREMENTAL");
                spoof_info.version_security_patch = get(device, "SECURITY_PATCH");
                if (device.count("TIMESTAMP")) {
                    spoof_info.time = std::stoll(device.at("TIMESTAMP")) * 1000;
                }

                // --- the version group, and only what the semaphore lets through ---
                const RomVersion rom = readRomVersion();
                const VersionPolicy policy = readVersionPolicy();
                auto allowed = [&rom, policy](const char* field, const std::string& value) {
                    if (policy == VersionPolicy::Force) return true;
                    if (policy == VersionPolicy::Never) return false;
                    // Rom: never above the ROM. Raising the SDK is what makes apps call APIs
                    // the framework does not have; lowering it only makes them ask for less.
                    const std::string f(field);
                    if (f == "SDK_INT" || f == "SDK_FULL") {
                        if (rom.sdk == 0) return false;
                        try { return std::stoi(value) <= rom.sdk; }
                        catch (const std::exception&) { return false; }
                    }
                    if (f == "ANDROID_VERSION") return !rom.release.empty() && value == rom.release;
                    if (f == "CODENAME") return !rom.codename.empty() && value == rom.codename;
                    return false;
                };

                const std::string cfg_codename = get(device, "CODENAME");
                if (!trim(cfg_codename).empty() && allowed("CODENAME", cfg_codename)) {
                    spoof_info.version_codename = cfg_codename;
                }

                if (device.count("ANDROID_VERSION")) {
                    const std::string value = device.at("ANDROID_VERSION");
                    if (allowed("ANDROID_VERSION", value)) spoof_info.android_version = value;
                }

                if (device.count("SDK_INT")) {
                    const std::string value = device.at("SDK_INT");
                    if (allowed("SDK_INT", value)) {
                        spoof_info.version_sdk_int = std::stoi(value);
                        spoof_info.version_sdk = std::to_string(spoof_info.version_sdk_int);
                    }
                }

                if (device.count("SDK_FULL")) {
                    const std::string value = device.at("SDK_FULL");
                    if (allowed("SDK_FULL", value)) {
                        auto dot_position = value.find('.');
                        int major = std::stoi(dot_position == std::string::npos ? value : value.substr(0, dot_position));
                        int minor = 0;
                        if (dot_position != std::string::npos) {
                            minor = std::stoi(value.substr(dot_position + 1));
                        }
                        spoof_info.version_sdk_int_full = major * 100000 + minor;
                    }
                }
                if (!spoof_info.version_sdk_int_full && spoof_info.version_sdk_int) {
                    spoof_info.version_sdk_int_full = spoof_info.version_sdk_int * 100000;
                }

                // Derived from what actually got through, by the AOSP rule. Left empty when the
                // version is not spoofed at all, so the framework keeps its own correct values.
                if (!spoof_info.version_codename.empty() || !spoof_info.android_version.empty()) {
                    const std::string cod = spoof_info.version_codename.empty()
                                          ? rom.codename : spoof_info.version_codename;
                    const std::string rel = spoof_info.android_version.empty()
                                          ? rom.release : spoof_info.android_version;
                    spoof_info.version_release_or_codename = releaseOrCodename(cod, rel);
                    spoof_info.version_release_or_preview_display = spoof_info.version_release_or_codename;
                }
            }
        } catch (const std::exception& e) {
            ERROR_LOG("Config error: %s", e.what());
            env->DeleteLocalRef(buildClass);
            if (versionClass) env->DeleteLocalRef(versionClass);
            return;
        }

        auto setStr = [this](jclass thisClass, jfieldID field, const std::string& value) {
            if (!field || trim(value).empty()) return;
            jstring js = env->NewStringUTF(value.c_str());
            if (!js || env->ExceptionCheck()) {
                env->ExceptionClear();
                return;
            }
            env->SetStaticObjectField(thisClass, field, js);
            env->DeleteLocalRef(js);
            if (env->ExceptionCheck()) env->ExceptionClear();
        };

        auto setInt = [this](jclass thisClass, jfieldID field, int value) {
            if (!field || value == 0) return;
            env->SetStaticIntField(thisClass, field, value);
            if (env->ExceptionCheck()) env->ExceptionClear();
        };

        auto setLong = [this](jclass thisClass, jfieldID field, int64_t value) {
            if (!field || value == 0) return;
            env->SetStaticLongField(thisClass, field, value);
            if (env->ExceptionCheck()) env->ExceptionClear();
        };

        setStr(buildClass, build_modelField, spoof_info.model);
        setStr(buildClass, build_brandField, spoof_info.brand);
        setStr(buildClass, build_deviceField, spoof_info.device);
        setStr(buildClass, build_manufacturerField, spoof_info.manufacturer);
        setStr(buildClass, build_fingerprintField, spoof_info.fingerprint);
        setStr(buildClass, build_productField, spoof_info.product);
        setStr(buildClass, build_boardField, spoof_info.board);
        setStr(buildClass, build_bootloaderField, spoof_info.bootloader);
        setStr(buildClass, build_hardwareField, spoof_info.hardware);
        setStr(buildClass, build_idField, spoof_info.id);
        setStr(buildClass, build_displayField, spoof_info.display);
        setStr(buildClass, build_hostField, spoof_info.host);
        setStr(buildClass, build_odm_skuField, spoof_info.odm_sku);
        setStr(buildClass, build_skuField, spoof_info.sku);
        setStr(buildClass, build_userField, spoof_info.user);
        setLong(buildClass, build_timeField, spoof_info.time);
        setStr(buildClass, build_tagsField, "release-keys");
        setStr(buildClass, build_typeField, "user");

        if (versionClass) {
            setStr(versionClass, build_version_codenameField, spoof_info.version_codename);
            setStr(versionClass, build_version_incrementalField, spoof_info.version_incremental);
            setStr(versionClass, build_version_sdkField, spoof_info.version_sdk);
            setInt(versionClass, build_version_sdk_int_fullField, spoof_info.version_sdk_int_full);
            setStr(versionClass, build_version_security_patchField, spoof_info.version_security_patch);
            setStr(versionClass, build_version_releaseField, spoof_info.android_version);
            setInt(versionClass, build_version_sdk_intField, spoof_info.version_sdk_int);
            setStr(versionClass, build_version_release_or_codenameField, spoof_info.version_release_or_codename);
            setStr(versionClass, build_version_release_or_preview_displayField, spoof_info.version_release_or_preview_display);
        }

        env->DeleteLocalRef(buildClass);
        if (versionClass) env->DeleteLocalRef(versionClass);
    }

public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        spoofDevice();

        api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }
};

REGISTER_ZYGISK_MODULE(COPGVDModule)
