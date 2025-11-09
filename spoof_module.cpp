#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <unordered_map>
#include <unistd.h>
#include <android/log.h>
#include <mutex>
#include <sys/stat.h>
#include <dlfcn.h>

using json = nlohmann::json;

#define LOG_TAG "SpoofModule"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static bool debug_mode = true;

// نوع تابع resetprop از libc
typedef int (*resetprop_t)(const char*, const char*);

struct DeviceInfo {
    std::string brand, device, manufacturer, model, fingerprint, product;
};

static DeviceInfo current_info;
static std::mutex info_mutex;
static jclass buildClass = nullptr;
static jfieldID modelField = nullptr, brandField = nullptr, deviceField = nullptr;
static jfieldID manufacturerField = nullptr, fingerprintField = nullptr, productField = nullptr;
static std::once_flag build_once;

static time_t last_config_mtime = 0;
static const std::string config_path = "/data/adb/modules/COPG/config.json";

struct JniString {
    JNIEnv* env; jstring jstr; const char* chars;
    JniString(JNIEnv* e, jstring s) : env(e), jstr(s), chars(nullptr) {
        if (jstr) chars = env->GetStringUTFChars(jstr, nullptr);
    }
    ~JniString() { if (jstr && chars) env->ReleaseStringUTFChars(jstr, chars); }
    const char* get() const { return chars; }
};

class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api; this->env = env;
        LOGD("Module loaded successfully");
        ensureBuildClass();
        reloadIfNeeded(true);
        
        // هوک کردن resetprop از libc
        api->pltHookRegister(".*libutils\\.so$", "android::resetprop::set", (void*)hooked_resetprop, nullptr);
        LOGD("resetprop hook registered");
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) { api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY); return; }
        JniString pkg(env, args->nice_name); const char* name = pkg.get();
        if (!name) { api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY); return; }

        LOGD("Processing package: %s", name);
        reloadIfNeeded(false);

        bool should_close = true;
        { std::lock_guard<std::mutex> lock(info_mutex);
            auto it = package_map.find(name);
            if (it != package_map.end()) {
                current_info = it->second;
                LOGD("Spoofing device: %s", current_info.model.c_str());
                spoofDevice(current_info);
                spoofPropsLibc(current_info);  // مستقیم از libc
                should_close = false;
            }
        }

        if (should_close) {
            LOGD("Package %s not in config, closing", name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            LOGD("DLCLOSE after spoofing");
        }
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) return;
        JniString pkg(env, args->nice_name); const char* name = pkg.get();
        if (!name) return;

        { std::lock_guard<std::mutex> lock(info_mutex);
            auto it = package_map.find(name);
            if (it != package_map.end()) {
                current_info = it->second;
                LOGD("Post-spoof: %s", current_info.model.c_str());
                spoofDevice(current_info);
                spoofPropsLibc(current_info);
            }
        }
        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

private:
    zygisk::Api* api; JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;

    void ensureBuildClass() {
        std::call_once(build_once, [&]() {
            jclass local = env->FindClass("android/os/Build");
            if (!local) return;
            buildClass = (jclass)env->NewGlobalRef(local);
            env->DeleteLocalRef(local);

            modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
            brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
            deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
            manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
            fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
            productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");
        });
    }

    void reloadIfNeeded(bool force = false) {
        struct stat st{}; if (stat(config_path.c_str(), &st) != 0) return;
        if (!force && st.st_mtime == last_config_mtime) { LOGD("Config unchanged"); return; }

        std::ifstream f(config_path); if (!f.is_open()) return;
        try {
            json j = json::parse(f); std::unordered_map<std::string, DeviceInfo> map;
            for (auto& [k, v] : j.items()) {
                if (k.find("PACKAGES_") != 0 || (k.size() >= 7 && k.substr(k.size()-7) == "_DEVICE")) continue;
                if (!v.is_array()) continue;
                std::string devk = k + "_DEVICE"; if (!j.contains(devk)) continue;
                auto d = j[devk];
                DeviceInfo info{
                    .brand = d.value("BRAND", "generic"),
                    .device = d.value("DEVICE", "generic"),
                    .manufacturer = d.value("MANUFACTURER", "generic"),
                    .model = d.value("MODEL", "generic"),
                    .fingerprint = d.value("FINGERPRINT", ""),
                    .product = d.value("PRODUCT", "generic")
                };
                for (auto& p : v.get<std::vector<std::string>>()) map[p] = info;
            }
            package_map = std::move(map);
            last_config_mtime = st.st_mtime;
            LOGD("Config reloaded: %zu packages", package_map.size());
        } catch (...) { LOGE("Config parse failed"); }
    }

    void spoofDevice(const DeviceInfo& i) {
        if (!buildClass) return;
        auto set = [&](jfieldID f, const std::string& v) {
            if (f) env->SetStaticObjectField(buildClass, f, env->NewStringUTF(v.c_str()));
        };
        set(modelField, i.model); set(brandField, i.brand); set(deviceField, i.device);
        set(manufacturerField, i.manufacturer); set(fingerprintField, i.fingerprint); set(productField, i.product);
    }

    // روش نهایی: مستقیم از libc.resetprop
    static int hooked_resetprop(const char* name, const char* value) {
        LOGD("resetprop intercepted: %s = %s", name, value);
        // همیشه موفقیت برگردون
        return 0;
    }

    void spoofPropsLibc(const DeviceInfo& info) {
        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (!handle) { LOGE("Failed to dlopen libc.so"); return; }

        resetprop_t real_resetprop = (resetprop_t)dlsym(handle, "resetprop");
        if (!real_resetprop) {
            real_resetprop = (resetprop_t)dlsym(handle, "_ZN7android10resetprop3setEPKcS2_");
            if (!real_resetprop) {
                LOGE("resetprop symbol not found");
                dlclose(handle);
                return;
            }
        }

        auto set = [&](const char* key, const std::string& val) {
            if (val.empty() || val == "generic") return;
            int ret = real_resetprop(key, val.c_str());
            LOGD(ret == 0 ? "Success (libc): %s = %s" : "Failed (libc): %s = %s (ret=%d)", key, val.c_str(), ret);
        };

        set("ro.product.model", info.model);
        set("ro.product.system.model", info.model);
        set("ro.product.vendor.model", info.model);
        set("ro.product.brand", info.brand);
        set("ro.product.system.brand", info.brand);
        set("ro.product.device", info.device);
        set("ro.product.manufacturer", info.manufacturer);
        set("ro.product.name", info.product);
        set("ro.build.fingerprint", info.fingerprint);

        dlclose(handle);
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
