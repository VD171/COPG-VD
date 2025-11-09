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
#include <sys/wait.h>
#include <cerrno>
#include <cstring>

using json = nlohmann::json;

#define LOG_TAG "SpoofModule"
#define LOGD(...) if (debug_mode) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static bool debug_mode = true;  // برای تست فعال باشه

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

class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;
        LOGD("Module loaded successfully");
        ensureBuildClass();
        reloadIfNeeded(true);
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
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        JniString pkg(env, args->nice_name);
        const char* package_name = pkg.get();
        if (!package_name) {
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
                LOGD("Spoofing device for %s: %s", package_name, current_info.model.c_str());
                spoofDevice(current_info);
                spoofProps(current_info);
                should_close = false;
            }
        }

        if (should_close) {
            LOGD("Package %s not in config, closing module", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            LOGD("Set DLCLOSE after spoofing");
        }
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name || package_map.empty()) return;

        ensureBuildClass();
        if (!buildClass) return;

        JniString pkg(env, args->nice_name);
        const char* package_name = pkg.get();
        if (!package_name) return;

        {
            std::lock_guard<std::mutex> lock(info_mutex);
            auto it = package_map.find(package_name);
            if (it != package_map.end()) {
                current_info = it->second;
                LOGD("Post-specialize spoofing for %s: %s", package_name, current_info.model.c_str());
                spoofDevice(current_info);
                spoofProps(current_info);
            }
        }

        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        LOGD("Set DLCLOSE in postAppSpecialize");
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;

    void ensureBuildClass() {
        std::call_once(build_once, [&] {
            jclass localBuild = env->FindClass("android/os/Build");
            if (!localBuild) return;
            buildClass = (jclass)env->NewGlobalRef(localBuild);
            env->DeleteLocalRef(localBuild);

            modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
            brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
            deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
            manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
            fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
            productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");
        });
    }

    void reloadIfNeeded(bool force = false) {
        struct stat st{};
        if (stat(config_path.c_str(), &st) != 0) return;
        if (!force && st.st_mtime == last_config_mtime) {
            LOGD("Config unchanged");
            return;
        }

        std::ifstream file(config_path);
        if (!file.is_open()) return;

        try {
            json config = json::parse(file);
            std::unordered_map<std::string, DeviceInfo> new_map;

            for (auto& [key, value] : config.items()) {
                if (key.find("PACKAGES_") != 0) continue;
                if (key.size() >= 7 && key.substr(key.size() - 7) == "_DEVICE") continue;
                if (!value.is_array()) continue;

                auto packages = value.get<std::vector<std::string>>();
                std::string dev_key = key + "_DEVICE";
                if (!config.contains(dev_key)) continue;

                auto dev = config[dev_key];
                DeviceInfo info{
                    .brand = dev.value("BRAND", "generic"),
                    .device = dev.value("DEVICE", "generic"),
                    .manufacturer = dev.value("MANUFACTURER", "generic"),
                    .model = dev.value("MODEL", "generic"),
                    .fingerprint = dev.value("FINGERPRINT", ""),
                    .product = dev.value("PRODUCT", "generic")
                };

                for (const auto& pkg : packages)
                    new_map[pkg] = info;
            }

            package_map = std::move(new_map);
            last_config_mtime = st.st_mtime;
            LOGD("Config reloaded: %zu packages", package_map.size());
        } catch (...) {
            LOGE("Failed to parse config");
        }
    }

    void spoofDevice(const DeviceInfo& info) {
        if (!buildClass) return;
        auto set = [&](jfieldID field, const std::string& val) {
            if (!field) return;
            jstring js = env->NewStringUTF(val.c_str());
            env->SetStaticObjectField(buildClass, field, js);
            env->DeleteLocalRef(js);
        };

        set(modelField, info.model);
        set(brandField, info.brand);
        set(deviceField, info.device);
        set(manufacturerField, info.manufacturer);
        set(fingerprintField, info.fingerprint);
        set(productField, info.product);
    }

    // بهترین روش: fork + execl (در Zygisk کاملاً کار می‌کنه)
    void spoofProps(const DeviceInfo& info) {
        static const char* resetprop_cmd = nullptr;
        static std::once_flag once;

        std::call_once(once, [&]() {
            const char* paths[] = {
                "/debug_ramdisk/resetprop",
                "/data/adb/magisk/resetprop",
                "/data/adb/ksu/bin/resetprop",
                "/data/adb/ap/bin/resetprop",
                "/system/bin/resetprop",
                nullptr
            };
            for (int i = 0; paths[i]; ++i) {
                if (access(paths[i], X_OK) == 0) {
                    resetprop_cmd = paths[i];
                    LOGD("resetprop found: %s", resetprop_cmd);
                    return;
                }
            }
            LOGD("resetprop not found!");
        });

        if (!resetprop_cmd) return;

        auto set = [&](const char* key, const std::string& val) {
            if (val.empty() || val == "generic") return;

            pid_t pid = fork();
            if (pid == 0) {
                // Child: مستقیم su رو صدا می‌زنه
                execl("/system/bin/su", "su", "-c", resetprop_cmd, key, val.c_str(), (char*)nullptr);
                _exit(127);  // اگر خطا داد
            } else if (pid > 0) {
                int status;
                waitpid(pid, &status, 0);
                if (WIFEXITED(status) && WEXITSTATUS(status) == 0) {
                    LOGD("Success: %s = %s", key, val.c_str());
                } else {
                    LOGE("Failed: %s = %s (status=%d)", key, val.c_str(), status);
                }
            } else {
                LOGE("fork failed: %s", strerror(errno));
            }
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
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
