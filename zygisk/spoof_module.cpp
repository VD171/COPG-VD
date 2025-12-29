#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <android/log.h>
#include <sys/stat.h>
#include <unordered_set>
#include <unordered_map>
#include <dobby.h>
#include <sys/system_properties.h>
#include <cstring>
#include <mutex>

using json = nlohmann::json;

#define LOG_TAG "COPGModule"

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define SPOOF_LOG(...) LOGI("[SPOOF] " __VA_ARGS__)
#define INFO_LOG(...) LOGI("[INFO] " __VA_ARGS__)
#define ERROR_LOG(...) LOGE("[ERROR] " __VA_ARGS__)

typedef void (*T_Callback)(void *, const char *, const char *, uint32_t);

static T_Callback o_callback = nullptr;
static void (*o_system_property_read_callback)(prop_info *, T_Callback, void *) = nullptr;
static std::unordered_map<std::string, std::string> original_props;
static std::string current_package;
static bool is_camera_package = false;
static std::mutex props_mutex;

static const std::string config_file = "/data/adb/COPG.json";
static const std::string original_device = "/data/adb/modules/COPG/original_device.txt";

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

static jclass buildClass = nullptr;
static jclass versionClass = nullptr;
static jfieldID build_modelField = nullptr;
static jfieldID build_brandField = nullptr;
static jfieldID build_deviceField = nullptr;
static jfieldID build_manufacturerField = nullptr;
static jfieldID build_fingerprintField = nullptr;
static jfieldID build_productField = nullptr;
static jfieldID build_version_releaseField = nullptr;
static jfieldID build_version_sdk_intField = nullptr;
static jfieldID build_boardField = nullptr;
static jfieldID build_bootloaderField = nullptr;
static jfieldID build_hardwareField = nullptr;
static jfieldID build_idField = nullptr;
static jfieldID build_displayField = nullptr;
static jfieldID build_hostField = nullptr;
static jfieldID build_odm_skuField = nullptr;
static jfieldID build_skuField = nullptr;
static jfieldID build_tagsField = nullptr;
static jfieldID build_timeField = nullptr;
static jfieldID build_typeField = nullptr;
static jfieldID build_version_codenameField = nullptr;
static jfieldID build_version_incrementalField = nullptr;
static jfieldID build_version_sdkField = nullptr;
static jfieldID build_version_sdk_int_fullField = nullptr;
static jfieldID build_version_security_patchField = nullptr;
static jfieldID build_version_release_or_codenameField = nullptr;
static jfieldID build_version_release_or_preview_displayField = nullptr;

static const std::unordered_set<std::string> camera_packages = {
    "com.google.android.GoogleCamera",
    "com.android.MGC",
    "com.sec.android.app.camera",
    "com.sgmediapp.gcam",
    "org.lineageos.aperture",
    "org.lineageos.aperture.dev",

    "com.google.android.camera",
    "com.android.camera",
    "com.huawei.camera",
    "zte.camera",

    "com.fotoable.fotobeauty",
    "com.commsource.beautyplus",
    "com.venticake.retrica",
    "com.joeware.android.gpulumera",
    "com.ywqc.picbeauty",
    "vStudio.Android.Camera360",
    "com.almalence.night",

    "com.google.android.GoogleCameraNext",
    "com.google.android.GoogleCameraEng",
    "com.android.camera2",
    "com.asus.camera",
    "com.blackberry.camera",
    "com.bq.camerabq",
    "com.vinsmart.camera",
    "com.hmdglobal.camera2",
    "com.lge.camera",
    "com.mediatek.camera",
    "com.motorola.camera",
    "com.motorola.cameraone",
    "com.motorola.camera2",
    "com.motorola.ts.camera",
    "com.oneplus.camera",
    "com.oppo.camera",
    "com.sonyericsson.android.camera",
    "com.vivo.devcamera",
    "com.mediatek.hz.camera",
    "vd171.ru"
};

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

static void modify_callback(void *cookie, const char *name, const char *value, uint32_t serial) {
    if (!name || !value || !o_callback) {
        if (o_callback) {
            o_callback(cookie, name, value, serial);
        }
        return;
    }
    std::lock_guard<std::mutex> lock(props_mutex);
    auto it = original_props.find(name);
    if (it != original_props.end()) {
        SPOOF_LOG("[%s] Props set: [%s]: OLD=%s new=%s", current_package.c_str(), name, value, it->second.c_str());
        return o_callback(cookie, name, it->second.c_str(), serial);
    }
    return o_callback(cookie, name, value, serial);
}

static void my_system_property_read_callback(prop_info *pi, T_Callback callback, void *cookie) {
    if (!pi || !callback) {
        if (o_system_property_read_callback) {
            o_system_property_read_callback(pi, callback, cookie);
        }
        return;
    }
    o_callback = callback;
    return o_system_property_read_callback(pi, modify_callback, cookie);
}

static bool installPropertyHookForCamera() {
    void *ptr = DobbySymbolResolver(nullptr, "__system_property_read_callback");
    if (!ptr) return false;
    if (DobbyHook(ptr, (void *)my_system_property_read_callback,
                  (void **)&o_system_property_read_callback) != 0) {
        return false;
    }

    auto brand_it = original_props.find("ro.product.brand");
    auto model_it = original_props.find("ro.product.model");
    
    std::string brand = (brand_it != original_props.end()) ? brand_it->second : "unknown";
    std::string model = (model_it != original_props.end()) ? model_it->second : "unknown";
    
    SPOOF_LOG("[%s] Props restored: %s (%s)", current_package.c_str(), model.c_str(), brand.c_str());
    return true;
}

void loadOriginalPropsFromFile() {
    std::lock_guard<std::mutex> lock(props_mutex);
    
    std::ifstream file(original_device);
    if (!file.is_open()) {
        ERROR_LOG("Failed to open: %s", original_device.c_str());
        return;
    }

    original_props.clear();
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;
        
        size_t pos = line.find('=');
        if (pos != std::string::npos) {
            std::string key = line.substr(0, pos);
            std::string value = line.substr(pos + 1);
            
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") + 1);
            
            if (!key.empty()) {
                original_props[key] = value;
            }
        }
    }
    file.close();
}

DeviceInfo loadDeviceFromConfig() {
    DeviceInfo info;
    
    std::ifstream file(config_file);
    if (!file.is_open()) {
        ERROR_LOG("Failed to open: %s", config_file.c_str());
        return info;
    }

    try {
        json config = json::parse(file);

        if (config.contains("COPG") && config["COPG"].is_object()) {
            auto device = config["COPG"];
            
            info.brand = device.value("BRAND", "");
            info.device = device.value("DEVICE", "");
            info.manufacturer = device.value("MANUFACTURER", "");
            info.model = device.value("MODEL", "");
            info.fingerprint = device.value("FINGERPRINT", "");
            info.product = device.value("PRODUCT", "");
            info.board = device.value("BOARD", "");
            info.bootloader = device.value("BOOTLOADER", "");
            info.hardware = device.value("HARDWARE", "");
            info.id = device.value("ID", "");
            info.display = device.value("DISPLAY", "");
            info.host = device.value("HOST", "");
            info.odm_sku = device.value("ODM_SKU", info.product);
            info.sku = device.value("SKU", info.hardware);
            info.version_incremental = device.value("INCREMENTAL", "");
            info.version_security_patch = device.value("SECURITY_PATCH", "");

            if (device.contains("TIMESTAMP")) {
                const auto& device_timestamp = device["TIMESTAMP"];
                if (device_timestamp.is_number_integer()) {
                    info.time = static_cast<int64_t>(device_timestamp.get<int64_t>()) * 1000;
                } else if (device_timestamp.is_string()) {
                    info.time = std::stoll(device_timestamp.get<std::string>()) * 1000;
                }
            }

            if (device.contains("ANDROID_VERSION")) {
                const auto& device_android_version = device["ANDROID_VERSION"];
                if (device_android_version.is_string()) {
                    info.android_version = device_android_version.get<std::string>();
                } else if (device_android_version.is_number()) {
                    info.android_version = std::to_string(device_android_version.get<int>());
                }
                info.version_release_or_codename = info.android_version;
                info.version_release_or_preview_display = info.android_version;
            }

            if (device.contains("SDK_INT")) {
                const auto& device_sdk_int = device["SDK_INT"];
                if (device_sdk_int.is_number()) {
                    info.version_sdk_int = device_sdk_int.get<int>();
                } else if (device_sdk_int.is_string()) {
                    info.version_sdk_int = std::stoi(device_sdk_int.get<std::string>());
                }
                info.version_sdk = std::to_string(info.version_sdk_int);
                info.version_sdk_int_full = info.version_sdk_int * 100000;
            }
        }
    } catch (const std::exception& e) {
        ERROR_LOG("Config error: %s", e.what());
    }
    file.close();
    return info;
}

void initBuildClass(JNIEnv* env) {
    jclass localBuild = env->FindClass("android/os/Build");
    if (!localBuild) {
        env->ExceptionClear();
        return;
    }

    buildClass = static_cast<jclass>(env->NewGlobalRef(localBuild));
    env->DeleteLocalRef(localBuild);
    if (!buildClass) return;

    build_modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
    build_brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
    build_deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
    build_manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
    build_fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
    build_productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");
    build_boardField = env->GetStaticFieldID(buildClass, "BOARD", "Ljava/lang/String;");
    build_bootloaderField = env->GetStaticFieldID(buildClass, "BOOTLOADER", "Ljava/lang/String;");
    build_hardwareField = env->GetStaticFieldID(buildClass, "HARDWARE", "Ljava/lang/String;");
    build_idField = env->GetStaticFieldID(buildClass, "ID", "Ljava/lang/String;");
    build_displayField = env->GetStaticFieldID(buildClass, "DISPLAY", "Ljava/lang/String;");
    build_hostField = env->GetStaticFieldID(buildClass, "HOST", "Ljava/lang/String;");
    build_odm_skuField = env->GetStaticFieldID(buildClass, "ODM_SKU", "Ljava/lang/String;");
    build_skuField = env->GetStaticFieldID(buildClass, "SKU", "Ljava/lang/String;");
    build_tagsField = env->GetStaticFieldID(buildClass, "TAGS", "Ljava/lang/String;");
    build_timeField = env->GetStaticFieldID(buildClass, "TIME", "J");
    build_typeField = env->GetStaticFieldID(buildClass, "TYPE", "Ljava/lang/String;");

    jclass localVersion = env->FindClass("android/os/Build$VERSION");
    if (localVersion) {
        versionClass = static_cast<jclass>(env->NewGlobalRef(localVersion));
        env->DeleteLocalRef(localVersion);
        
        if (versionClass) {
            build_version_releaseField = env->GetStaticFieldID(versionClass, "RELEASE", "Ljava/lang/String;");
            build_version_sdk_intField = env->GetStaticFieldID(versionClass, "SDK_INT", "I");
            build_version_codenameField = env->GetStaticFieldID(versionClass, "CODENAME", "Ljava/lang/String;");
            build_version_incrementalField = env->GetStaticFieldID(versionClass, "INCREMENTAL", "Ljava/lang/String;");
            build_version_sdkField = env->GetStaticFieldID(versionClass, "SDK", "Ljava/lang/String;");
            build_version_sdk_int_fullField = env->GetStaticFieldID(versionClass, "SDK_INT_FULL", "I");
            build_version_security_patchField = env->GetStaticFieldID(versionClass, "SECURITY_PATCH", "Ljava/lang/String;");
            build_version_release_or_codenameField = env->GetStaticFieldID(versionClass, "RELEASE_OR_CODENAME", "Ljava/lang/String;");
            build_version_release_or_preview_displayField = env->GetStaticFieldID(versionClass, "RELEASE_OR_PREVIEW_DISPLAY", "Ljava/lang/String;");
        }
    }

    if (env->ExceptionCheck()) {
        env->ExceptionClear();
    }
}

void spoofBuild(JNIEnv* env, const DeviceInfo& info) {
    if (!buildClass) return;

    auto setStr = [&](jclass thisClass, jfieldID field, const std::string& value) {
        if (!field || value.empty() || value == " ") return;
        jstring js = env->NewStringUTF(value.c_str());
        if (!js || env->ExceptionCheck()) {
            env->ExceptionClear();
            return;
        }
        env->SetStaticObjectField(thisClass, field, js);
        env->DeleteLocalRef(js);
        if (env->ExceptionCheck()) {
            env->ExceptionClear();
        }
    };

    auto setInt = [&](jclass thisClass, jfieldID field, int value) {
        if (!field || value == 0) return;
        env->SetStaticIntField(thisClass, field, value);
        if (env->ExceptionCheck()) {
            env->ExceptionClear();
        }
    };

    auto setLong = [&](jclass thisClass, jfieldID field, int64_t value) {
        if (!field || value == 0) return;
        env->SetStaticLongField(thisClass, field, value);
        if (env->ExceptionCheck()) {
            env->ExceptionClear();
        }
    };

    setStr(buildClass, build_modelField, info.model);
    setStr(buildClass, build_brandField, info.brand);
    setStr(buildClass, build_deviceField, info.device);
    setStr(buildClass, build_manufacturerField, info.manufacturer);
    setStr(buildClass, build_fingerprintField, info.fingerprint);
    setStr(buildClass, build_productField, info.product);
    setStr(buildClass, build_boardField, info.board);
    setStr(buildClass, build_bootloaderField, info.bootloader);
    setStr(buildClass, build_hardwareField, info.hardware);
    setStr(buildClass, build_idField, info.id);
    setStr(buildClass, build_displayField, info.display);
    setStr(buildClass, build_hostField, info.host);
    setStr(buildClass, build_odm_skuField, info.odm_sku);
    setStr(buildClass, build_skuField, info.sku);
    setLong(buildClass, build_timeField, info.time);
    setStr(buildClass, build_tagsField, "release-keys");
    setStr(buildClass, build_typeField, "user");

    if (versionClass) {
        setStr(versionClass, build_version_codenameField, "REL");
        setStr(versionClass, build_version_incrementalField, info.version_incremental);
        setStr(versionClass, build_version_sdkField, info.version_sdk);
        setInt(versionClass, build_version_sdk_int_fullField, info.version_sdk_int_full);
        setStr(versionClass, build_version_security_patchField, info.version_security_patch);
        setStr(versionClass, build_version_releaseField, info.android_version);
        setInt(versionClass, build_version_sdk_intField, info.version_sdk_int);
        setStr(versionClass, build_version_release_or_codenameField, info.version_release_or_codename);
        setStr(versionClass, build_version_release_or_preview_displayField, info.version_release_or_preview_display);
    }

    SPOOF_LOG("[%s] Build spoofed: %s (%s)", current_package.c_str(), info.model.c_str(), info.brand.c_str());
}

class COPGModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;
    }

    void onUnload() {
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
        api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }

    void postServerSpecialize(const zygisk::ServerSpecializeArgs*) override {
        api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        
        if (!args || !args->nice_name) {
            return;
        }

        JniString pkg(env, args->nice_name);
        const char* package_name = pkg.get();

        if (!package_name) {
            return;
        }

        api->setOption(zygisk::FORCE_DENYLIST_UNMOUNT);

        current_package = std::string(package_name);
        is_camera_package = camera_packages.find(current_package) != camera_packages.end();

        if (is_camera_package) {
            loadOriginalPropsFromFile();
        } else {
            initBuildClass(env);
            DeviceInfo spoof_info = loadDeviceFromConfig();
            spoofBuild(env, spoof_info);
        }
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs*) override {
        if (is_camera_package) installPropertyHookForCamera();
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
};

REGISTER_ZYGISK_MODULE(COPGModule)
