#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <json.hpp>
#include <fstream>
#include <android/log.h>
#include <algorithm>
#include <cctype>

using json = nlohmann::json;

#define LOG_TAG "COPGModule"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define ERROR_LOG(...) LOGE("[ERROR] " __VA_ARGS__)

static const std::string config_file = "/data/adb/COPG.json";

struct DeviceInfo {
    std::string brand;
    std::string device;
    std::string manufacturer;
    std::string model;
    std::string fingerprint;
    std::string product;
    std::string android_version;
    int version_sdk_int;
    std::string board;
    std::string bootloader;
    std::string hardware;
    std::string id;
    std::string display;
    std::string host;
    std::string odm_sku;
    std::string sku;
    int64_t time;
    std::string version_incremental;
    std::string version_sdk;
    int version_sdk_int_full;
    std::string version_security_patch;
    std::string version_release_or_codename;
    std::string version_release_or_preview_display;
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

class COPGModule : public zygisk::ModuleBase {
private:
    zygisk::Api* api = nullptr;
    JNIEnv* env = nullptr;

    DeviceInfo spoof_info;

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

        std::ifstream file(config_file);
        if (!file.is_open()) {
            ERROR_LOG("Failed to open: %s", config_file.c_str());
            env->DeleteLocalRef(buildClass);
            if (versionClass) env->DeleteLocalRef(versionClass);
            return;
        }

        try {
            json config = json::parse(file);

            if (config.contains("COPG") && config["COPG"].is_object()) {
                auto device = config["COPG"];
                
                spoof_info.brand = device.value("BRAND", "");
                spoof_info.device = device.value("DEVICE", "");
                spoof_info.manufacturer = device.value("MANUFACTURER", "");
                spoof_info.model = device.value("MODEL", "");
                spoof_info.fingerprint = device.value("FINGERPRINT", "");
                spoof_info.product = device.value("PRODUCT", "");
                spoof_info.board = device.value("BOARD", "");
                spoof_info.bootloader = device.value("BOOTLOADER", "");
                spoof_info.hardware = device.value("HARDWARE", "");
                spoof_info.id = device.value("ID", "");
                spoof_info.display = device.value("DISPLAY", "");
                spoof_info.host = device.value("HOST", "");
                spoof_info.odm_sku = device.value("ODM_SKU", spoof_info.product);
                spoof_info.sku = device.value("SKU", spoof_info.hardware);
                spoof_info.version_incremental = device.value("INCREMENTAL", "");
                spoof_info.version_security_patch = device.value("SECURITY_PATCH", "");

                if (device.contains("TIMESTAMP")) {
                    const auto& device_timestamp = device["TIMESTAMP"];
                    if (device_timestamp.is_number_integer()) {
                        spoof_info.time = static_cast<int64_t>(device_timestamp.get<int64_t>()) * 1000;
                    } else if (device_timestamp.is_string()) {
                        spoof_info.time = std::stoll(device_timestamp.get<std::string>()) * 1000;
                    }
                }

                if (device.contains("ANDROID_VERSION")) {
                    const auto& device_android_version = device["ANDROID_VERSION"];
                    spoof_info.android_version = std::to_string(device_android_version.get<int>());
                    spoof_info.version_release_or_codename = spoof_info.android_version;
                    spoof_info.version_release_or_preview_display = spoof_info.android_version;
                }

                if (device.contains("SDK_INT")) {
                    const auto& device_sdk_int = device["SDK_INT"];
                    spoof_info.version_sdk_int = std::stoi(device_sdk_int.get<std::string>());
                    spoof_info.version_sdk = std::to_string(spoof_info.version_sdk_int);
                    spoof_info.version_sdk_int_full = spoof_info.version_sdk_int * 100000;
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
        setLong(buildClass, build_timeField, spoof_info.time);
        setStr(buildClass, build_tagsField, "release-keys");
        setStr(buildClass, build_typeField, "user");

        if (versionClass) {
            setStr(versionClass, build_version_codenameField, "REL");
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

REGISTER_ZYGISK_MODULE(COPGModule)
