#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <android/log.h>
#include <mutex>
#include <sys/stat.h>

using json = nlohmann::json;

#define LOG_TAG "COPGModule"

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define CONFIG_LOG(...) LOGI("[CONFIG] " __VA_ARGS__)
#define SPOOF_LOG(...) LOGI("[SPOOF] " __VA_ARGS__)

static bool debug_mode = false;

struct DeviceInfo {
    std::string brand;
    std::string device;
    std::string manufacturer;
    std::string model;
    std::string fingerprint;
    std::string product;
    std::string android_version;
    int sdk_int;
    bool should_spoof_android_version = false;
    bool should_spoof_sdk_int = false;
    std::string build_board;
    std::string build_bootloader;
    std::string build_hardware;
    std::string build_id;
    std::string build_display;
    std::string build_host;
};

static DeviceInfo current_info;
static std::mutex info_mutex;
static jclass buildClass = nullptr;
static jclass versionClass = nullptr;
static jfieldID modelField = nullptr;
static jfieldID brandField = nullptr;
static jfieldID deviceField = nullptr;
static jfieldID manufacturerField = nullptr;
static jfieldID fingerprintField = nullptr;
static jfieldID productField = nullptr;
static jfieldID releaseField = nullptr;
static jfieldID sdkIntField = nullptr;
static jfieldID build_boardField = nullptr;
static jfieldID build_bootloaderField = nullptr;
static jfieldID build_hardwareField = nullptr;
static jfieldID build_idField = nullptr;
static jfieldID build_displayField = nullptr;
static jfieldID build_hostField = nullptr;

static std::once_flag build_once;

static time_t last_config_mtime = 0;
static const std::string config_path = "/data/adb/modules/COPG/COPG.json";

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

bool operator!=(const DeviceInfo& a, const DeviceInfo& b) {
    return a.brand != b.brand || a.device != b.device || a.model != b.model ||
           a.manufacturer != b.manufacturer || a.fingerprint != b.fingerprint ||
           a.product != b.product || a.build_board != b.build_board ||
           a.build_bootloader != b.build_bootloader || a.build_id != b.build_id ||
           a.build_hardware != b.build_hardware ||
           a.build_display != b.build_display || a.build_host != b.build_host;
}

class COPGModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        ensureBuildClass();
        reloadIfNeeded(true);

        {
            std::lock_guard<std::mutex> lock(info_mutex);
            if (spoof_device && current_info != *spoof_device) {
                current_info = *spoof_device;
                spoofDevice(current_info);
            }
        }
    }

    void onUnload() {
        std::lock_guard<std::mutex> lock(info_mutex);
        if (buildClass) {
            env->DeleteGlobalRef(buildClass);
            buildClass = nullptr;
        }
        if (versionClass) {
            env->DeleteGlobalRef(versionClass);
            versionClass = nullptr;
        }
    }
       
    void preServerSpecialize(zygisk::ServerSpecializeArgs*) override {
        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

    void postServerSpecialize(const zygisk::ServerSpecializeArgs*) override {
        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        ensureBuildClass();
        reloadIfNeeded(true);

        {
            std::lock_guard<std::mutex> lock(info_mutex);
            if (spoof_device && current_info != *spoof_device) {
                current_info = *spoof_device;
                spoofDevice(current_info);
            }
        }

        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::optional<DeviceInfo> spoof_device;

    void ensureBuildClass() {
        std::call_once(build_once, [&] {
            jclass localBuild = env->FindClass("android/os/Build");
            if (!localBuild) {
                env->ExceptionClear();
                return;
            }

            buildClass = static_cast<jclass>(env->NewGlobalRef(localBuild));
            env->DeleteLocalRef(localBuild);
            if (!buildClass) {
                return;
            }

            modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
            brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
            deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
            manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
            fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
            productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");
            build_boardField = env->GetStaticFieldID(buildClass, "BOARD", "Ljava/lang/String;");
            build_bootloaderField = env->GetStaticFieldID(buildClass, "BOOTLOADER", "Ljava/lang/String;");
            build_hardwareField = env->GetStaticFieldID(buildClass, "HARDWARE", "Ljava/lang/String;");
            build_idField = env->GetStaticFieldID(buildClass, "ID", "Ljava/lang/String;");
            build_displayField = env->GetStaticFieldID(buildClass, "DISPLAY", "Ljava/lang/String;");
            build_hostField = env->GetStaticFieldID(buildClass, "HOST", "Ljava/lang/String;");

            jclass localVersion = env->FindClass("android/os/Build$VERSION");
            if (localVersion) {
                versionClass = static_cast<jclass>(env->NewGlobalRef(localVersion));
                env->DeleteLocalRef(localVersion);
                
                if (versionClass) {
                    releaseField = env->GetStaticFieldID(versionClass, "RELEASE", "Ljava/lang/String;");
                    sdkIntField = env->GetStaticFieldID(versionClass, "SDK_INT", "I");
                }
            }

            if (env->ExceptionCheck()) {
                env->ExceptionClear();
                if (buildClass) env->DeleteGlobalRef(buildClass);
                if (versionClass) env->DeleteGlobalRef(versionClass);
                buildClass = nullptr;
                versionClass = nullptr;
            }
        });
    }

    void reloadIfNeeded(bool force = false) {
        struct stat file_stat;
        if (stat(config_path.c_str(), &file_stat) != 0) {
            CONFIG_LOG("Config missing: %s", config_path.c_str());
            return;
        }

        time_t current_mtime = file_stat.st_mtime;
        if (!force && current_mtime == last_config_mtime) {
            return;
        }

        CONFIG_LOG("Loading config...");

        std::ifstream file(config_path);
        if (!file.is_open()) {
            CONFIG_LOG("Failed to open config");
            return;
        }

        try {
            json config = json::parse(file);

            std::string device_key = "COPG";
            if (config.contains(device_key) && config[device_key].is_object()) {
                auto device = config[device_key];
                DeviceInfo info;
                info.brand = device.value("BRAND", "generic");
                info.device = device.value("DEVICE", "generic");
                info.manufacturer = device.value("MANUFACTURER", "generic");
                info.model = device.value("MODEL", "generic");
                info.fingerprint = device.value("FINGERPRINT", "generic/brand/device:13/TQ3A.230805.001/123456:user/release-keys");
                info.product = device.value("PRODUCT", info.brand);
                info.build_board = device.value("BOARD", info.model);
                info.build_bootloader = device.value("BOOTLOADER", "unknown");
                info.build_hardware = device.value("HARDWARE", info.model);
                info.build_id = device.value("ID", "generic");
                info.build_display = device.value("DISPLAY", "generic");
                info.build_host = device.value("HOST", "generic");
    
                if (device.contains("ANDROID_VERSION")) {
                    try {
                        if (device["ANDROID_VERSION"].is_string()) {
                            info.android_version = device["ANDROID_VERSION"].get<std::string>();
                            info.should_spoof_android_version = !info.android_version.empty();
                        } else if (device["ANDROID_VERSION"].is_number()) {
                            info.android_version = std::to_string(device["ANDROID_VERSION"].get<int>());
                            info.should_spoof_android_version = true;
                        }
                    } catch (const std::exception& e) {
                        LOGW("Failed to parse ANDROID_VERSION: %s", e.what());
                        info.should_spoof_android_version = false;
                    }
                } else {
                    info.should_spoof_android_version = false;
                }
    
                if (device.contains("SDK_INT")) {
                    try {
                        if (device["SDK_INT"].is_number()) {
                            info.sdk_int = device["SDK_INT"].get<int>();
                            info.should_spoof_sdk_int = true;
                        } else if (device["SDK_INT"].is_string()) {
                            std::string sdk_str = device["SDK_INT"].get<std::string>();
                            if (!sdk_str.empty()) {
                                info.sdk_int = std::stoi(sdk_str);
                                info.should_spoof_sdk_int = true;
                            }
                        }
                    } catch (const std::exception& e) {
                        LOGW("Failed to parse SDK_INT: %s", e.what());
                        info.should_spoof_sdk_int = false;
                    }
                } else {
                    info.should_spoof_sdk_int = false;
                }

                {
                    std::lock_guard<std::mutex> lock(info_mutex);
                    spoof_device = info;
                }
   
                last_config_mtime = current_mtime;
                CONFIG_LOG("Loaded device: %s", 
                          info.device.c_str());
            } else {
                LOGE("Device error: nothing found");
            }        
        } catch (const json::exception& e) {
            LOGE("JSON error: %s", e.what());
        } catch (const std::exception& e) {
            LOGE("Config error: %s", e.what());
        }
        file.close();
    }

    void spoofDevice(const DeviceInfo& info) {
        if (!buildClass) {
            return;
        }

        auto setStr = [&](jfieldID field, const std::string& value) {
            if (!field) return;
            jstring js = env->NewStringUTF(value.c_str());
            if (!js || env->ExceptionCheck()) {
                env->ExceptionClear();
                return;
            }
            env->SetStaticObjectField(buildClass, field, js);
            env->DeleteLocalRef(js);
            if (env->ExceptionCheck()) {
                env->ExceptionClear();
            }
        };

        auto setInt = [&](jfieldID field, int value) {
            if (!field) return;
            env->SetStaticIntField(versionClass, field, value);
            if (env->ExceptionCheck()) {
                env->ExceptionClear();
            }
        };

        setStr(modelField, info.model);
        setStr(brandField, info.brand);
        setStr(deviceField, info.device);
        setStr(manufacturerField, info.manufacturer);
        setStr(fingerprintField, info.fingerprint);
        setStr(productField, info.product);
        setStr(build_boardField, info.build_board);
        setStr(build_bootloaderField, info.build_bootloader);
        setStr(build_hardwareField, info.build_hardware);
        //setStr(build_idField, info.build_id);
        //setStr(build_displayField, info.build_display);
        //setStr(build_hostField, info.build_host);
        
        if (info.should_spoof_android_version && versionClass && releaseField) {
            setStr(releaseField, info.android_version);
        }
        
        if (info.should_spoof_sdk_int && versionClass && sdkIntField) {
            setInt(sdkIntField, info.sdk_int);
        }
        
        SPOOF_LOG("Device spoofed: %s (%s)", info.model.c_str(), info.brand.c_str());
    }
};

REGISTER_ZYGISK_MODULE(COPGModule)
