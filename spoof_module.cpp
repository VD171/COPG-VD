// merged_spoof_with_prop_hook.cpp

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

using json = nlohmann::json;

#define LOG_TAG "SpoofModule"
#define LOGD(...) if (debug_mode) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// debug_mode default (user set to false in original)
static bool debug_mode = false;

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

// ------------------------------------------------------------
// Exec capture helper (useful for debug; optional)
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Property hook implementations (property_get and __system_property_get)
// ------------------------------------------------------------

// Typedefs for original functions
using fn_property_get = int(*)(const char *key, char *value, const char *def);
using fn___system_property_get = int(*)(const char *name, char *value);

// Saved original pointers (resolved lazily)
static fn_property_get real_property_get = nullptr;
static fn___system_property_get real___system_property_get = nullptr;

// Helper: check if we should spoof this key and fill out_value
static bool check_and_fill_spoof(const char* key, char* out_value, size_t out_len) {
    if (!key || !out_value || out_len == 0) return false;

    std::string skey(key);
    std::lock_guard<std::mutex> lock(info_mutex);

    // If current_info is empty, don't spoof
    if (current_info.model.empty() && current_info.brand.empty() && current_info.device.empty()
        && current_info.manufacturer.empty() && current_info.fingerprint.empty() && current_info.product.empty()) {
        return false;
    }

    if (skey == "ro.product.model") {
        strncpy(out_value, current_info.model.c_str(), out_len - 1);
        out_value[out_len - 1] = '\0';
        return true;
    }
    if (skey == "ro.product.brand") {
        strncpy(out_value, current_info.brand.c_str(), out_len - 1);
        out_value[out_len - 1] = '\0';
        return true;
    }
    if (skey == "ro.product.device") {
        strncpy(out_value, current_info.device.c_str(), out_len - 1);
        out_value[out_len - 1] = '\0';
        return true;
    }
    if (skey == "ro.product.manufacturer" || skey == "ro.product.manufacturer.name") {
        strncpy(out_value, current_info.manufacturer.c_str(), out_len - 1);
        out_value[out_len - 1] = '\0';
        return true;
    }
    if (skey == "ro.build.fingerprint" || skey == "ro.build.fingerprint.override") {
        strncpy(out_value, current_info.fingerprint.c_str(), out_len - 1);
        out_value[out_len - 1] = '\0';
        return true;
    }
    if (skey == "ro.product.name" || skey == "ro.product.product" || skey == "ro.product") {
        strncpy(out_value, current_info.product.c_str(), out_len - 1);
        out_value[out_len - 1] = '\0';
        return true;
    }

    return false;
}

// Replacement for property_get
extern "C" int property_get(const char *key, char *value, const char *def) {
    if (!real_property_get) {
        real_property_get = (fn_property_get)dlsym(RTLD_NEXT, "property_get");
        if (!real_property_get && debug_mode) {
            LOGE("real property_get not found via dlsym");
        }
    }

    if (value) {
        if (check_and_fill_spoof(key, value, PROP_VALUE_MAX)) {
            if (debug_mode) LOGD("property_get -> spoofed %s = %s", key, value);
            return (int)strlen(value);
        }
    }

    if (real_property_get) {
        return real_property_get(key, value, def);
    }

    if (value) {
        if (def) {
            strncpy(value, def, PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return (int)strlen(value);
        } else {
            value[0] = '\0';
            return 0;
        }
    }
    return 0;
}

// Replacement for __system_property_get
extern "C" int __system_property_get(const char *name, char *value) {
    if (!real___system_property_get) {
        real___system_property_get = (fn___system_property_get)dlsym(RTLD_NEXT, "__system_property_get");
        if (!real___system_property_get && debug_mode) {
            LOGE("real __system_property_get not found via dlsym");
        }
    }

    if (value) {
        if (check_and_fill_spoof(name, value, PROP_VALUE_MAX)) {
            if (debug_mode) LOGD("__system_property_get -> spoofed %s = %s", name, value);
            return (int)strlen(value);
        }
    }

    if (real___system_property_get) {
        return real___system_property_get(name, value);
    }

    if (value) {
        value[0] = '\0';
    }
    return 0;
}

// ------------------------------------------------------------
// The original SpoofModule (mostly unchanged) but now uses hooks above
// ------------------------------------------------------------
class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        LOGD("Module loaded successfully");

        // Make sure Build class is ready and config loaded
        ensureBuildClass();
        reloadIfNeeded(true);

        // (Optional) If you want to warm-resolve original property functions for clearer logs:
        if (debug_mode) {
            real_property_get = (fn_property_get)dlsym(RTLD_NEXT, "property_get");
            real___system_property_get = (fn___system_property_get)dlsym(RTLD_NEXT, "__system_property_get");
            LOGD("dlsym property_get=%p __system_property_get=%p", (void*)real_property_get, (void*)real___system_property_get);
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

                // Set JNI Build.* fields (for Java-level checks)
                spoofDevice(current_info);

                // Note: property_get/__system_property_get hooks will now return spoofed values
                should_close = false;
            }
        }

        if (should_close) {
            LOGD("Package %s not found in config, closing module", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            // Keep stealth: close library from loader after we've done necessary inits/hooks
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
                // Expect keys like "PACKAGES_X" and "PACKAGES_X_DEVICE"
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
