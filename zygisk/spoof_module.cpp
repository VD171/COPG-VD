/*
 * ======================================================================
 *  COPG-VD  ::  global device spoofer
 *  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
 *
 *  Copyright (C) 2026  AlirezaParsi & VD171
 *  SPDX-License-Identifier: Apache-2.0
 *  Fork by VD171.
 *
 *  Licensed under the Apache License, Version 2.0; you may obtain a copy at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/COPG-VD
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <map>
#include <set>
#include <vector>
#include <fcntl.h>
#include <unistd.h>
#include <cstdlib>
#include <cerrno>
#include <android/log.h>
#include <algorithm>
#include <cctype>
#include "prop_virtualizer.hpp"

#define JSMN_STATIC
#define JSMN_STRICT
#include "jsmn.h"

#define LOG_TAG "COPG-VD"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define ERROR_LOG(...) LOGE("[ERROR] " __VA_ARGS__)

static const std::string config_file = "/data/adb/COPG-VD.json";
static const std::string rom_prop_file = "/system/build.prop";
static const std::string version_policy_file = "/data/adb/modules/COPG-VD/.spoof.version";

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
    int version_device_initial_sdk_int = 0;
};

struct ScopeConfig {
    std::string mode = "playstore";
    bool motor_jni = true;
    bool motor_prop_hook = true;
    bool motor_drm = false;
    std::string prop_method = "off";
    std::vector<std::string> whitelist;
    std::vector<std::string> blacklist;
    std::vector<std::string> playstore;
    std::vector<std::string> global_fields;
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

static bool readFile(const std::string& path, std::string& out) {
    const int fd = open(path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) return false;
    out.clear();
    char buf[4096];
    for (;;) {
        const ssize_t n = read(fd, buf, sizeof(buf));
        if (n < 0) { close(fd); return false; }
        if (n == 0) break;
        out.append(buf, static_cast<size_t>(n));
        if (out.size() > (1u << 20)) break;
    }
    close(fd);
    return true;
}

static bool parseInt(const std::string& s, long long& out) {
    if (s.empty()) return false;
    char* end = nullptr;
    errno = 0;
    const long long v = strtoll(s.c_str(), &end, 10);
    if (errno != 0 || end == s.c_str() || *end != '\0') return false;
    out = v;
    return true;
}

static void forEachLine(const std::string& text, void (*fn)(const std::string&, void*), void* ctx) {
    size_t start = 0;
    while (start < text.size()) {
        size_t nl = text.find('\n', start);
        if (nl == std::string::npos) nl = text.size();
        fn(text.substr(start, nl - start), ctx);
        start = nl + 1;
    }
}

static RomVersion readRomVersion() {
    RomVersion rom;
    std::string text;
    if (!readFile(rom_prop_file, text)) return rom;
    forEachLine(text, [](const std::string& line, void* ctx) {
        RomVersion& r = *static_cast<RomVersion*>(ctx);
        auto take = [&line](const char* key, std::string& out) {
            const std::string needle = std::string(key) + "=";
            if (line.rfind(needle, 0) == 0) out = trim(line.substr(needle.size()));
        };
        take("ro.build.version.release", r.release);
        take("ro.build.version.codename", r.codename);
        std::string sdk;
        take("ro.build.version.sdk", sdk);
        long long v;
        if (!sdk.empty() && parseInt(sdk, v)) r.sdk = static_cast<int>(v);
    }, &rom);
    return rom;
}

static VersionPolicy readVersionPolicy() {
    std::string text;
    if (!readFile(version_policy_file, text)) return VersionPolicy::Never;
    const size_t nl = text.find('\n');
    const std::string value = trim(nl == std::string::npos ? text : text.substr(0, nl));
    if (value == "force") return VersionPolicy::Force;
    if (value == "rom") return VersionPolicy::Rom;
    return VersionPolicy::Never;
}

static std::string releaseOrCodename(const std::string& codename, const std::string& release) {
    return (codename.empty() || codename == "REL") ? release : codename;
}

using Config = std::map<std::string, std::string>;

static int skipToken(const std::vector<jsmntok_t>& t, int i) {
    int j = i + 1;
    for (int k = 0; k < t[i].size; k++) j = skipToken(t, j);
    return j;
}

static std::string tokenText(const std::string& text, const jsmntok_t& tok) {
    return text.substr(tok.start, tok.end - tok.start);
}

static bool trailingComma(const std::string& text, const jsmntok_t& tok) {
    int p = tok.end - 2;
    while (p > tok.start && std::isspace(static_cast<unsigned char>(text[p]))) p--;
    return p > tok.start && text[p] == ',';
}

static bool gapHas(const std::string& text, int a, int b, char c) {
    for (int p = a; p < b && p < static_cast<int>(text.size()); p++) if (text[p] == c) return true;
    return false;
}

static bool validTree(const std::string& text, const std::vector<jsmntok_t>& t, int i, int& next) {
    const jsmntok_t& tok = t[i];
    if ((tok.type == JSMN_OBJECT || tok.type == JSMN_ARRAY) && tok.size > 0 && trailingComma(text, tok))
        return false;
    if (tok.type == JSMN_OBJECT) {
        int j = i + 1, prevEnd = -1;
        for (int k = 0; k < tok.size; k++) {
            if (j + 1 >= static_cast<int>(t.size()) || t[j].type != JSMN_STRING || t[j].size != 1) return false;
            if (prevEnd >= 0 && !gapHas(text, prevEnd, t[j].start, ',')) return false;
            if (!gapHas(text, t[j].end, t[j + 1].start, ':')) return false;
            int after;
            if (!validTree(text, t, j + 1, after)) return false;
            prevEnd = t[j + 1].end;
            j = after;
        }
        next = j;
        return true;
    }
    if (tok.type == JSMN_ARRAY) {
        int j = i + 1, prevEnd = -1;
        for (int k = 0; k < tok.size; k++) {
            if (j >= static_cast<int>(t.size())) return false;
            if (prevEnd >= 0 && !gapHas(text, prevEnd, t[j].start, ',')) return false;
            int after;
            if (!validTree(text, t, j, after)) return false;
            prevEnd = t[j].end;
            j = after;
        }
        next = j;
        return true;
    }
    if (tok.size != 0) return false;
    next = i + 1;
    return true;
}

static bool readConfig(const std::string& path, Config& out, std::set<std::string>* del = nullptr,
                       ScopeConfig* scope = nullptr) {
    std::string text;
    if (!readFile(path, text)) return false;

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
        const jsmntok_t& val = tokens[i + 1];
        const std::string keyName = (key.type == JSMN_STRING) ? tokenText(text, key) : std::string();
        if (keyName == LOG_TAG && val.type == JSMN_OBJECT) {
            int p = i + 2;
            for (int n = 0; n < val.size; n++) {
                const jsmntok_t& k2 = tokens[p];
                const jsmntok_t& v2 = tokens[p + 1];
                if (k2.type == JSMN_STRING && (v2.type == JSMN_STRING || v2.type == JSMN_PRIMITIVE)) {
                    out[tokenText(text, k2)] = tokenText(text, v2);
                }
                p = skipToken(tokens, p);
            }
        } else if (del && keyName == "COPG-VD-Delete" && val.type == JSMN_ARRAY) {
            int p = i + 2;
            for (int n = 0; n < val.size; n++) {
                if (tokens[p].type == JSMN_STRING) del->insert(tokenText(text, tokens[p]));
                p = skipToken(tokens, p);
            }
        } else if (scope && keyName == "scope_mode" && val.type == JSMN_STRING) {
            scope->mode = tokenText(text, val);
        } else if (scope && keyName == "prop_method" && val.type == JSMN_STRING) {
            scope->prop_method = tokenText(text, val);
        } else if (scope && keyName == "motor_jni" && val.type == JSMN_PRIMITIVE) {
            scope->motor_jni = tokenText(text, val) != "false";
        } else if (scope && keyName == "motor_prop_hook" && val.type == JSMN_PRIMITIVE) {
            scope->motor_prop_hook = tokenText(text, val) != "false";
        } else if (scope && keyName == "motor_drm" && val.type == JSMN_PRIMITIVE) {
            scope->motor_drm = tokenText(text, val) == "true";
        } else if (scope && val.type == JSMN_ARRAY &&
                   (keyName == "scope_whitelist" || keyName == "scope_blacklist" ||
                    keyName == "scope_playstore_targets" || keyName == "global_fields")) {
            std::vector<std::string>& dst = keyName == "scope_whitelist" ? scope->whitelist
                                          : keyName == "scope_blacklist" ? scope->blacklist
                                          : keyName == "global_fields"   ? scope->global_fields
                                                                         : scope->playstore;
            int p = i + 2;
            for (int n = 0; n < val.size; n++) {
                if (tokens[p].type == JSMN_STRING) dst.push_back(tokenText(text, tokens[p]));
                p = skipToken(tokens, p);
            }
        }
        i = skipToken(tokens, i);
    }
    return true;
}

static std::string get(const Config& c, const char* key, const std::string& fallback = "") {
    auto it = c.find(key);
    return it == c.end() ? fallback : it->second;
}

static bool procMatches(const std::string& entry, const std::string& proc) {
    return proc == entry || proc.rfind(entry + ":", 0) == 0;
}
static bool inScope(const ScopeConfig& sc, const std::string& proc) {
    if (sc.mode == "whitelist") {
        for (const auto& e : sc.whitelist) if (procMatches(e, proc)) return true;
        return false;
    }
    if (sc.mode == "blacklist") {
        for (const auto& e : sc.blacklist) if (procMatches(e, proc)) return false;
        return true;
    }
    if (sc.mode == "playstore") {
        if (sc.playstore.empty())
            return proc == "com.google.android.gms" ||
                   proc == "com.google.android.gms.unstable" ||
                   proc == "com.android.vending";
        for (const auto& e : sc.playstore) if (procMatches(e, proc)) return true;
        return false;
    }
    return true;
}

static jint   (*orig_drm_getSecurityLevel)(JNIEnv*, jobject) = nullptr;
static jint   (*orig_drm_getSecurityLevelSession)(JNIEnv*, jobject, jbyteArray) = nullptr;
static jstring(*orig_drm_getPropertyString)(JNIEnv*, jobject, jstring) = nullptr;
static int         g_drm_level_int = 0;
static const char* g_drm_level_str = nullptr;

static jint drm_getSecurityLevel(JNIEnv* env, jobject thiz) {
    if (g_drm_level_int) return g_drm_level_int;
    if (orig_drm_getSecurityLevel) return orig_drm_getSecurityLevel(env, thiz);
    return 0;
}

static jint drm_getSecurityLevelSession(JNIEnv* env, jobject thiz, jbyteArray sessionId) {
    if (g_drm_level_int) return g_drm_level_int;
    if (orig_drm_getSecurityLevelSession) return orig_drm_getSecurityLevelSession(env, thiz, sessionId);
    return 0;
}

static jstring drm_getPropertyString(JNIEnv* env, jobject thiz, jstring name) {
    if (g_drm_level_str && name) {
        const char* n = env->GetStringUTFChars(name, nullptr);
        const bool match = n && std::string(n) == "securityLevel";
        if (n) env->ReleaseStringUTFChars(name, n);
        if (match) return env->NewStringUTF(g_drm_level_str);
    }
    if (orig_drm_getPropertyString) return orig_drm_getPropertyString(env, thiz, name);
    return env->NewStringUTF("");
}

class COPGVDModule : public zygisk::ModuleBase {
private:
    zygisk::Api* api = nullptr;
    JNIEnv* env = nullptr;
    JavaVM* jvm = nullptr;

    void refreshEnv() {
        if (jvm) jvm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6);
    }

    DeviceInfo spoof_info{};
    ScopeConfig scope_cfg;
    Config cfg_device;
    std::set<std::string> cfg_del;
    bool cfg_ok = false;
    bool scoped_mode = false;
    bool keep_resident = false;
    bool restrict_global = false;
    bool isGlobalField(const char* key) const {
        for (const auto& k : scope_cfg.global_fields) if (k == key) return true;
        return false;
    }

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
        jfieldID build_version_device_initial_sdk_intField = nullptr;

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
            build_version_device_initial_sdk_intField = getField(versionClass, "DEVICE_INITIAL_SDK_INT", "I");
        }

        Config& device = cfg_device;
        std::set<std::string>& del = cfg_del;
        if (!cfg_ok) {
            env->DeleteLocalRef(buildClass);
            if (versionClass) env->DeleteLocalRef(versionClass);
            return;
        }

        {
            if (!device.empty()) {

                if (device.count("TIMESTAMP")) {
                    long long ts;
                    if (parseInt(get(device, "TIMESTAMP"), ts)) spoof_info.time = ts * 1000;
                }

                const RomVersion rom = readRomVersion();
                const VersionPolicy policy = readVersionPolicy();
                auto allowed = [&rom, policy](const char* field, const std::string& value) {
                    if (policy == VersionPolicy::Force) return true;
                    if (policy == VersionPolicy::Never) return false;
                    const std::string f(field);
                    if (f == "SDK_INT" || f == "SDK_FULL") {
                        if (rom.sdk == 0) return false;
                        long long v;
                        const size_t dot = value.find('.');
                        return parseInt(dot == std::string::npos ? value : value.substr(0, dot), v)
                               && v <= rom.sdk;
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
                    const std::string value = get(device, "ANDROID_VERSION");
                    if (allowed("ANDROID_VERSION", value)) spoof_info.android_version = value;
                }

                if (device.count("SDK_INT")) {
                    const std::string value = get(device, "SDK_INT");
                    long long v;
                    if (allowed("SDK_INT", value) && parseInt(value, v)) {
                        spoof_info.version_sdk_int = static_cast<int>(v);
                        spoof_info.version_sdk = std::to_string(spoof_info.version_sdk_int);
                    }
                }

                if (device.count("SDK_FULL")) {
                    const std::string value = get(device, "SDK_FULL");
                    if (allowed("SDK_FULL", value)) {
                        const auto dot_position = value.find('.');
                        long long major = 0, minor = 0;
                        const bool okMajor = parseInt(dot_position == std::string::npos ? value : value.substr(0, dot_position), major);
                        const bool okMinor = dot_position == std::string::npos || parseInt(value.substr(dot_position + 1), minor);
                        if (okMajor && okMinor) spoof_info.version_sdk_int_full = static_cast<int>(major * 100000 + minor);
                    }
                }
                if (!spoof_info.version_sdk_int_full && spoof_info.version_sdk_int) {
                    spoof_info.version_sdk_int_full = spoof_info.version_sdk_int * 100000;
                }

                if (device.count("FIRST_API_LEVEL") && !del.count("FIRST_API_LEVEL")) {
                    long long v;
                    if (parseInt(get(device, "FIRST_API_LEVEL"), v)) {
                        spoof_info.version_device_initial_sdk_int = static_cast<int>(v);
                    }
                }

                if (!spoof_info.version_codename.empty() || !spoof_info.android_version.empty()) {
                    const std::string cod = spoof_info.version_codename.empty()
                                          ? rom.codename : spoof_info.version_codename;
                    const std::string rel = spoof_info.android_version.empty()
                                          ? rom.release : spoof_info.android_version;
                    spoof_info.version_release_or_codename = releaseOrCodename(cod, rel);
                    spoof_info.version_release_or_preview_display = spoof_info.version_release_or_codename;
                }
            }
        }

        auto setStr = [this](jclass thisClass, jfieldID field, const std::string& value) {
            if (restrict_global) return;
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
            if (restrict_global) return;
            if (!field || value == 0) return;
            env->SetStaticIntField(thisClass, field, value);
            if (env->ExceptionCheck()) env->ExceptionClear();
        };

        auto setLong = [this](jclass thisClass, jfieldID field, int64_t value) {
            if (restrict_global) return;
            if (!field || value == 0) return;
            env->SetStaticLongField(thisClass, field, value);
            if (env->ExceptionCheck()) env->ExceptionClear();
        };

        auto resolved = [&device, &del](const char* key) -> std::string {
            if (del.count(key)) return std::string();
            auto it = device.find(key);
            return it == device.end() ? std::string() : it->second;
        };
        auto applyStr = [this, &device, &del](jclass cls, jfieldID field, const char* key,
                                              const std::string& fallback = std::string()) {
            if (!field) return;
            if (restrict_global && !isGlobalField(key)) return;
            if (del.count(key)) {
                env->SetStaticObjectField(cls, field, nullptr);
                if (env->ExceptionCheck()) env->ExceptionClear();
                return;
            }
            std::string value;
            auto it = device.find(key);
            if (it != device.end()) value = it->second;
            else if (!fallback.empty()) value = fallback;
            else return;
            jstring js = env->NewStringUTF(value.c_str());
            if (!js || env->ExceptionCheck()) { env->ExceptionClear(); return; }
            env->SetStaticObjectField(cls, field, js);
            env->DeleteLocalRef(js);
            if (env->ExceptionCheck()) env->ExceptionClear();
        };
        const std::string fb_product = resolved("PRODUCT");
        const std::string fb_hardware = resolved("HARDWARE");

        applyStr(buildClass, build_modelField, "MODEL");
        applyStr(buildClass, build_brandField, "BRAND");
        applyStr(buildClass, build_deviceField, "DEVICE");
        applyStr(buildClass, build_manufacturerField, "MANUFACTURER");
        applyStr(buildClass, build_fingerprintField, "FINGERPRINT");
        applyStr(buildClass, build_productField, "PRODUCT");
        applyStr(buildClass, build_boardField, "BOARD");
        applyStr(buildClass, build_bootloaderField, "BOOTLOADER");
        applyStr(buildClass, build_hardwareField, "HARDWARE");
        applyStr(buildClass, build_idField, "ID");
        applyStr(buildClass, build_displayField, "DISPLAY");
        applyStr(buildClass, build_hostField, "HOST");
        applyStr(buildClass, build_odm_skuField, "ODM_SKU", fb_product);
        applyStr(buildClass, build_skuField, "SKU", fb_hardware);
        applyStr(buildClass, build_userField, "USER");
        setLong(buildClass, build_timeField, spoof_info.time);
        setStr(buildClass, build_tagsField, "release-keys");
        setStr(buildClass, build_typeField, "user");

        if (versionClass) {
            setStr(versionClass, build_version_codenameField, spoof_info.version_codename);
            applyStr(versionClass, build_version_incrementalField, "INCREMENTAL");
            setStr(versionClass, build_version_sdkField, spoof_info.version_sdk);
            setInt(versionClass, build_version_sdk_int_fullField, spoof_info.version_sdk_int_full);
            applyStr(versionClass, build_version_security_patchField, "SECURITY_PATCH");
            setStr(versionClass, build_version_releaseField, spoof_info.android_version);
            setInt(versionClass, build_version_sdk_intField, spoof_info.version_sdk_int);
            setStr(versionClass, build_version_release_or_codenameField, spoof_info.version_release_or_codename);
            setStr(versionClass, build_version_release_or_preview_displayField, spoof_info.version_release_or_preview_display);
            setInt(versionClass, build_version_device_initial_sdk_intField, spoof_info.version_device_initial_sdk_int);
        }

        env->DeleteLocalRef(buildClass);
        if (versionClass) env->DeleteLocalRef(versionClass);
    }

    void installPropHook() {
        if (scope_cfg.motor_prop_hook && scope_cfg.prop_method == "mmap")
            copgvd::propvirt::install(cfg_device);
    }

    void installDrmHook() {
        if (!scope_cfg.motor_drm) return;
        const std::string lvl = get(cfg_device, "DRM_SECURITY_LEVEL", "L1");
        const bool l3 = (lvl == "L3" || lvl == "l3");
        g_drm_level_int = l3 ? 1 : 3;
        g_drm_level_str = l3 ? "L3" : "L1";
        JNINativeMethod methods[] = {
            {"getSecurityLevel", "()I", (void*)drm_getSecurityLevel},
            {"getSecurityLevel", "([B)I", (void*)drm_getSecurityLevelSession},
            {"getPropertyString", "(Ljava/lang/String;)Ljava/lang/String;", (void*)drm_getPropertyString},
        };
        api->hookJniNativeMethods(env, "android/media/MediaDrm", methods, 3);
        orig_drm_getSecurityLevel        = (jint(*)(JNIEnv*, jobject)) methods[0].fnPtr;
        orig_drm_getSecurityLevelSession = (jint(*)(JNIEnv*, jobject, jbyteArray)) methods[1].fnPtr;
        orig_drm_getPropertyString       = (jstring(*)(JNIEnv*, jobject, jstring)) methods[2].fnPtr;
        keep_resident = true;
    }

    std::string niceName(const zygisk::AppSpecializeArgs* args) {
        if (!args || !args->nice_name) return std::string();
        const char* s = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!s) return std::string();
        std::string name(s);
        env->ReleaseStringUTFChars(args->nice_name, s);
        return name;
    }

    void applyEngines() {
        if (scope_cfg.motor_jni) spoofDevice();
        if (scope_cfg.motor_prop_hook) installPropHook();
        installDrmHook();
    }

    void spoofGlobalFields() {
        if (!scope_cfg.motor_jni || scope_cfg.global_fields.empty()) return;
        restrict_global = true;
        spoofDevice();
        restrict_global = false;
    }

public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;
        if (env) env->GetJavaVM(&jvm);

        cfg_ok = readConfig(config_file, cfg_device, &cfg_del, &scope_cfg);
        scoped_mode = !(scope_cfg.mode == "global" || scope_cfg.mode.empty());
        if (!scoped_mode) {
            applyEngines();
            if (!keep_resident) api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
        } else {
            spoofGlobalFields();
        }
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!scoped_mode) return;
        refreshEnv();
        if (!inScope(scope_cfg, niceName(args)))
            api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!scoped_mode) return;
        refreshEnv();
        if (inScope(scope_cfg, niceName(args))) applyEngines();
        if (!keep_resident) api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }
};

REGISTER_ZYGISK_MODULE(COPGVDModule)
