#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <unordered_map>
#include <sys/system_properties.h>
#include <dlfcn.h>        // Added for dlopen, dlsym, dlclose, dlerror, RTLD_LAZY
#include <sys/mman.h>     // Added for mprotect, PROT_READ, PROT_WRITE, PROT_EXEC
#include <unistd.h>
#include <android/log.h>
#include <mutex>

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
    std::string product;
};

typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;

static DeviceInfo current_info;
static std::mutex info_mutex;
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
            jclass localBuildClass = env->FindClass("android/os/Build");
            if (!localBuildClass) {
                LOGE("Failed to find android/os/Build class");
                return;
            }
            
            buildClass = (jclass)env->NewGlobalRef(localBuildClass);
            env->DeleteLocalRef(localBuildClass);
            
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

            if (!modelField || !brandField || !deviceField || !manufacturerField || !fingerprintField || !productField) {
                LOGE("Failed to get field IDs for Build class");
                env->DeleteGlobalRef(buildClass);
                buildClass = nullptr;
                return;
            }
        }

        if (!hookJniSetStaticObjectField()) {
            LOGE("Failed to hook JNI_SetStaticObjectField");
        }

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
        
        {
            std::lock_guard<std::mutex> lock(info_mutex);
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

        {
            std::lock_guard<std::mutex> lock(info_mutex);
            auto it = package_map.find(package_name);
            if (it != package_map.end()) {
                current_info = it->second;
                LOGD("Post-specialize spoofing for %s: %s", package_name, current_info.model.c_str());
                spoofDevice(current_info);
                spoofSystemProperties(current_info);
            }
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
                info.product = device.contains("PRODUCT") ? device["PRODUCT"].get<std::string>() : info.brand;

                for (const auto& pkg : packages) {
                    package_map[pkg] = info;
                    LOGD("Loaded package %s with model %s", pkg.c_str(), info.model.c_str());
                }
            }
            LOGD("Config loaded with %zu packages", package_map.size());
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
        if (modelField) env->SetStaticObjectField(buildClass, modelField, env->NewStringUTF(info.model.c_str()));
        if (brandField) env->SetStaticObjectField(buildClass, brandField, env->NewStringUTF(info.brand.c_str()));
        if (deviceField) env->SetStaticObjectField(buildClass, deviceField, env->NewStringUTF(info.device.c_str()));
        if (manufacturerField) env->SetStaticObjectField(buildClass, manufacturerField, env->NewStringUTF(info.manufacturer.c_str()));
        if (fingerprintField) env->SetStaticObjectField(buildClass, fingerprintField, env->NewStringUTF(info.fingerprint.c_str()));
        if (productField) env->SetStaticObjectField(buildClass, productField, env->NewStringUTF(info.product.c_str()));
    }

    void spoofSystemProperties(const DeviceInfo& info) {
        LOGD("Spoofing system properties for: %s", info.model.c_str());
        if (!info.brand.empty()) __system_property_set("ro.product.brand", info.brand.c_str());
        if (!info.device.empty()) __system_property_set("ro.product.device", info.device.c_str());
        if (!info.manufacturer.empty()) __system_property_set("ro.product.manufacturer", info.manufacturer.c_str());
        if (!info.model.empty()) __system_property_set("ro.product.model", info.model.c_str());
        if (!info.fingerprint.empty()) __system_property_set("ro.build.fingerprint", info.fingerprint.c_str());
        if (!info.product.empty()) __system_property_set("ro.product.product", info.product.c_str());
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

    bool hookJniSetStaticObjectField() {
        void* handle = dlopen("libandroid_runtime.so", RTLD_LAZY);
        if (!handle) {
            LOGE("Failed to open libandroid_runtime.so: %s", dlerror());
            return false;
        }

        void* sym = dlsym(handle, "JNI_SetStaticObjectField");
        if (!sym) {
            LOGE("Failed to find JNI_SetStaticObjectField: %s", dlerror());
            dlclose(handle);
            return false;
        }

        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            LOGE("Failed to mprotect for JNI_SetStaticObjectField: %s", strerror(errno));
            dlclose(handle);
            return false;
        }

        orig_set_static_object_field = *(orig_set_static_object_field_t*)&sym;
        *(void**)&sym = (void*)hooked_set_static_object_field;
        mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
        dlclose(handle);
        
        LOGD("Successfully hooked JNI_SetStaticObjectField");
        return true;
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
