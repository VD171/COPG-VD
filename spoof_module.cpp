#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <unordered_map>
#include <sys/system_properties.h>
#include <dlfcn.h>
#include <sys/mman.h>
#include <unistd.h>
#include <android/log.h>

using json = nlohmann::json;

#define LOG_TAG "SpoofModule"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

struct DeviceInfo {
    std::string brand;
    std::string device;
    std::string manufacturer;
    std::string model;
    std::string fingerprint;
};

typedef int (*orig_prop_get_t)(const char*, char*, const char*);
static orig_prop_get_t orig_prop_get = nullptr;
typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;

static DeviceInfo current_info;
static jclass buildClass = nullptr;
static jfieldID modelField = nullptr;
static jfieldID brandField = nullptr;
static jfieldID deviceField = nullptr;
static jfieldID manufacturerField = nullptr;
static jfieldID fingerprintField = nullptr;
static jfieldID productField = nullptr;

class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        LOGD("Module loaded successfully");

        if (!buildClass) {
            buildClass = (jclass)env->NewGlobalRef(env->FindClass("android/os/Build"));
            if (buildClass) {
                modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
                brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
                deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
                manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
                fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
                productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");
            } else {
                LOGE("Failed to find android/os/Build class");
            }
        }

        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            orig_prop_get = (orig_prop_get_t)dlsym(handle, "__system_property_get");
            dlclose(handle);
        } else {
            LOGE("Failed to open libc.so");
        }

        hookNativeGetprop();
        hookJniSetStaticObjectField();
        loadConfig();
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) {
            LOGD("No package name provided, closing module");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }
        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) {
            LOGE("Failed to get package name");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }
        LOGD("Processing package: %s", package_name);
        auto it = package_map.find(package_name);
        if (it == package_map.end()) {
            LOGD("Package %s not found in config, closing module", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            current_info = it->second;
            LOGD("Spoofing device for package %s: %s", package_name, current_info.model.c_str());
            spoofDevice(current_info);
            spoofSystemProperties(current_info);
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name || package_map.empty() || !buildClass) return;
        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) {
            LOGE("Failed to get package name in postAppSpecialize");
            return;
        }
        auto it = package_map.find(package_name);
        if (it != package_map.end()) {
            current_info = it->second;
            LOGD("Post-specialize spoofing for %s: %s", package_name, current_info.model.c_str());
            spoofDevice(current_info);
            spoofSystemProperties(current_info);
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;

    void loadConfig() {
        const std::string config_path = "/data/adb/modules/COPG/config.json";
        LOGD("Attempting to load config from: %s", config_path.c_str());

        if (access(config_path.c_str(), R_OK) != 0) {
            LOGE("Cannot access config.json at %s: %s", config_path.c_str(), strerror(errno));
            return;
        }

        std::ifstream file(config_path);
        if (!file.is_open()) {
            LOGE("Failed to open config.json at %s", config_path.c_str());
            return;
        }
        LOGD("Config file opened successfully");

        try {
            json config = json::parse(file);
            for (auto& [key, value] : config.items()) {
                if (key.find("_DEVICE") != std::string::npos) continue;
                auto packages = value.get<std::vector<std::string>>();
                std::string device_key = key + "_DEVICE";
                if (!config.contains(device_key)) {
                    LOGE("No device info for key %s", key.c_str());
                    continue;
                }
                auto device = config[device_key];

                DeviceInfo info;
                info.brand = device["BRAND"].get<std::string>();
                info.device = device["DEVICE"].get<std::string>();
                info.manufacturer = device["MANUFACTURER"].get<std::string>();
                info.model = device["MODEL"].get<std::string>();
                info.fingerprint = device.contains("FINGERPRINT") ? 
                    device["FINGERPRINT"].get<std::string>() : "generic/brand/device:13/TQ3A.230805.001/123456:user/release-keys";

                for (const auto& pkg : packages) {
                    package_map[pkg] = info;
                    LOGD("Loaded package %s with model %s", pkg.c_str(), info.model.c_str());
                }
            }
            LOGD("Config loaded with %zu packages", package_map.size());
        } catch (const json::exception& e) {
            LOGE("JSON parsing error: %s", e.what());
        }
        file.close();
    }

    void spoofDevice(const DeviceInfo& info) {
        LOGD("Spoofing device: %s", info.model.c_str());
        if (modelField) env->SetStaticObjectField(buildClass, modelField, env->NewStringUTF(info.model.c_str()));
        if (brandField) env->SetStaticObjectField(buildClass, brandField, env->NewStringUTF(info.brand.c_str()));
        if (deviceField) env->SetStaticObjectField(buildClass, deviceField, env->NewStringUTF(info.device.c_str()));
        if (manufacturerField) env->SetStaticObjectField(buildClass, manufacturerField, env->NewStringUTF(info.manufacturer.c_str()));
        if (fingerprintField) env->SetStaticObjectField(buildClass, fingerprintField, env->NewStringUTF(info.fingerprint.c_str()));
        if (productField) env->SetStaticObjectField(buildClass, productField, env->NewStringUTF(info.device.c_str()));
    }

    void spoofSystemProperties(const DeviceInfo& info) {
        LOGD("Spoofing system properties for: %s", info.model.c_str());
        if (!info.brand.empty()) __system_property_set("ro.product.brand", info.brand.c_str());
        if (!info.device.empty()) __system_property_set("ro.product.device", info.device.c_str());
        if (!info.manufacturer.empty()) __system_property_set("ro.product.manufacturer", info.manufacturer.c_str());
        if (!info.model.empty()) __system_property_set("ro.product.model", info.model.c_str());
        if (!info.fingerprint.empty()) __system_property_set("ro.build.fingerprint", info.fingerprint.c_str());
    }

    static int hooked_prop_get(const char* name, char* value, const char* default_value) {
        if (!orig_prop_get) return -1;
        if (std::string(name) == "ro.product.brand" && !current_info.brand.empty()) {
            strncpy(value, current_info.brand.c_str(), PROP_VALUE_MAX);
            return current_info.brand.length();
        } else if (std::string(name) == "ro.product.device" && !current_info.device.empty()) {
            strncpy(value, current_info.device.c_str(), PROP_VALUE_MAX);
            return current_info.device.length();
        } else if (std::string(name) == "ro.product.manufacturer" && !current_info.manufacturer.empty()) {
            strncpy(value, current_info.manufacturer.c_str(), PROP_VALUE_MAX);
            return current_info.manufacturer.length();
        } else if (std::string(name) == "ro.product.model" && !current_info.model.empty()) {
            strncpy(value, current_info.model.c_str(), PROP_VALUE_MAX);
            return current_info.model.length();
        } else if (std::string(name) == "ro.build.fingerprint" && !current_info.fingerprint.empty()) {
            strncpy(value, current_info.fingerprint.c_str(), PROP_VALUE_MAX);
            return current_info.fingerprint.length();
        }
        return orig_prop_get(name, value, default_value);
    }

    void hookNativeGetprop() {
        if (!orig_prop_get) return;
        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            void* sym = dlsym(handle, "__system_property_get");
            if (sym) {
                size_t page_size = sysconf(_SC_PAGE_SIZE);
                void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
                if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == 0) {
                    *(void**)&orig_prop_get = (void*)hooked_prop_get;
                    mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
                    LOGD("Successfully hooked __system_property_get");
                } else {
                    LOGE("Failed to mprotect for __system_property_get");
                }
            }
            dlclose(handle);
        } else {
            LOGE("Failed to open libc.so for property hook");
        }
    }

    static void hooked_set_static_object_field(JNIEnv* env, jclass clazz, jfieldID fieldID, jobject value) {
        if (clazz == buildClass) {
            if (fieldID == modelField || fieldID == brandField || fieldID == deviceField ||
                fieldID == manufacturerField || fieldID == fingerprintField || fieldID == productField) {
                LOGD("Blocked attempt to reset Build field");
                return;
            }
        }
        if (orig_set_static_object_field) {
            orig_set_static_object_field(env, clazz, fieldID, value);
        }
    }

    void hookJniSetStaticObjectField() {
        void* handle = dlopen("libandroid_runtime.so", RTLD_LAZY);
        if (handle) {
            void* sym = dlsym(handle, "JNI_SetStaticObjectField");
            if (sym) {
                size_t page_size = sysconf(_SC_PAGE_SIZE);
                void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
                if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == 0) {
                    orig_set_static_object_field = *(orig_set_static_object_field_t*)&sym;
                    *(void**)&sym = (void*)hooked_set_static_object_field;
                    mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
                    LOGD("Successfully hooked JNI_SetStaticObjectField");
                } else {
                    LOGE("Failed to mprotect for JNI_SetStaticObjectField");
                }
            }
            dlclose(handle);
        } else {
            LOGE("Failed to open libandroid_runtime.so");
        }
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
