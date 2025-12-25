#include <jni.h>
#include <string>
#include <zygisk.hpp>
#include <nlohmann/json.hpp>
#include <fstream>
#include <android/log.h>
#include <mutex>
#include <thread>
#include <sys/stat.h>
#include <unistd.h>
#include <dirent.h>
#include <signal.h>
#include <algorithm>
#include <unordered_set>

using json = nlohmann::json;

#define LOG_TAG "COPGModule"

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define SPOOF_LOG(...) LOGI("[SPOOF] " __VA_ARGS__)
#define INFO_LOG(...) LOGI("[INFO] " __VA_ARGS__)
#define ERROR_LOG(...) LOGE("[ERROR] " __VA_ARGS__)
#define WARN_LOG(...) LOGW("[WARN] " __VA_ARGS__)

static bool debug_mode = false;

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
    std::string soc_manufacturer;
    std::string soc_model;
    std::string tags;
    int64_t time;
    std::string type;
    std::string user;
    std::string version_codename;
    std::string version_incremental;
    std::string version_sdk;
    int version_sdk_int_full;
    std::string version_security_patch;
    std::string version_release_or_codename;
    std::string version_release_or_preview_display;
};

static DeviceInfo current_info;
static DeviceInfo original_info;
static std::mutex info_mutex;
static std::mutex kill_mutex;
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
static jfieldID build_soc_manufacturerField = nullptr;
static jfieldID build_soc_modelField = nullptr;
static jfieldID build_tagsField = nullptr;
static jfieldID build_timeField = nullptr;
static jfieldID build_typeField = nullptr;
static jfieldID build_userField = nullptr;
static jfieldID build_version_codenameField = nullptr;
static jfieldID build_version_incrementalField = nullptr;
static jfieldID build_version_sdkField = nullptr;
static jfieldID build_version_sdk_int_fullField = nullptr;
static jfieldID build_version_security_patchField = nullptr;
static jfieldID build_version_release_or_codenameField = nullptr;
static jfieldID build_version_release_or_preview_displayField = nullptr;

static const std::unordered_set<std::string> gms_packages = {
    "com.android.vending",
    "com.google.android.gsf",
    "com.google.android.gms"
};

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
    "com.mediatek.hz.camera"
};

static std::once_flag build_once;
static std::once_flag original_once;

static time_t last_config_mtime = 0;
static const std::string config_file = "/data/adb/COPG.json";

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
    return a.brand != b.brand || a.device != b.device || a.id != b.id ||
           a.manufacturer != b.manufacturer || a.model != b.model ||
           a.fingerprint != b.fingerprint || a.product != b.product ||
           a.board != b.board || a.hardware != b.hardware || a.sku != b.sku ||
           a.bootloader != b.bootloader || a.display != b.display ||
           a.host != b.host || a.odm_sku != b.odm_sku || a.tags != b.tags ||
           a.soc_manufacturer != b.soc_manufacturer || a.user != b.user ||
           a.soc_model != b.soc_model || a.time != b.time || a.type != b.type ||
           a.version_codename != b.version_codename ||
           a.version_incremental != b.version_incremental ||
           a.version_sdk != b.version_sdk || a.version_sdk_int != b.version_sdk_int ||
           a.version_sdk_int_full != b.version_sdk_int_full ||
           a.version_security_patch != b.version_security_patch ||
           a.android_version != b.android_version ||
           a.version_release_or_codename != b.version_release_or_codename ||
           a.version_release_or_preview_display != b.version_release_or_preview_display;
}

void killGmsProcesses(const char* package_name) {
    std::lock_guard<std::mutex> lock(kill_mutex);
    const int timeout_ms = 1000;
    for (const auto& pkg : gms_packages) {
    	if (pkg == package_name) continue;
        bool killed = false;
        DIR* dir = opendir("/proc");
        if (dir) {
            struct dirent* entry;
            while ((entry = readdir(dir)) != nullptr) {
                if (entry->d_type != DT_DIR) continue;
                pid_t pid = static_cast<pid_t>(atoi(entry->d_name));
                if (pid <= 0) continue;
                std::ifstream cmdline("/proc/" + std::string(entry->d_name) + "/cmdline");
                if (!cmdline.is_open()) continue;
                std::string process_name;
                std::getline(cmdline, process_name, '\0');
                if (process_name == pkg) {
                    if (kill(pid, SIGTERM) == 0) {
                        int elapsed = 0;
                        const int step = 50;
                        while (elapsed < timeout_ms) {
                            if (kill(pid, 0) != 0) {
                                INFO_LOG("Killed via SIGTERM: %s (PID %d)", pkg.c_str(), pid);
                                killed = true;
                                break;
                            }
                            usleep(step * 1000);
                            elapsed += step;
                        }
                    }
                    if (!killed && kill(pid, SIGKILL) == 0) {
                        INFO_LOG("Killed via SIGKILL: %s (PID %d)", pkg.c_str(), pid);
                        killed = true;
                    }
                }
            }
            closedir(dir);
        }

        if (!killed) {
            if (system(("kill $(pidof " + pkg + ") 2>/dev/null").c_str()) == 0) {
                INFO_LOG("Killed via shell SIGTERM: %s", pkg.c_str());
                killed = true;
            } else if (system(("kill -9 $(pidof " + pkg + ") 2>/dev/null").c_str()) == 0) {
                INFO_LOG("Killed via shell SIGKILL: %s", pkg.c_str());
                killed = true;
            }
        }

        if (!killed) {
            ERROR_LOG("Failed to kill process: %s", pkg.c_str());
        }
    }
}

class COPGModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        ensureBuildClass();
        ensureOriginalInfo();       
        reloadIfNeeded();

        {
            std::lock_guard<std::mutex> lock(info_mutex);
            if (spoof_info && current_info != *spoof_info) {
                current_info = *spoof_info;
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
        reloadIfNeeded();

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

        bool info_changed = false;
        bool is_camera_package = camera_packages.find(package_name) != camera_packages.end();

        {
            std::lock_guard<std::mutex> lock(info_mutex);

            const DeviceInfo& target_info = is_camera_package ? original_info : 
                                            (spoof_info ? *spoof_info : current_info);
            
            if (current_info != target_info) {
                current_info = target_info;
                INFO_LOG("Restoring %s device for: %s (%s)", 
                         is_camera_package ? "original" : "spoofed",
                         package_name, current_info.model.c_str());
                spoofDevice(current_info);
                info_changed = true;
            }
        }

        if (info_changed && !is_camera_package) {
            INFO_LOG("Device changed to %s (%s). Killing GMS processes...", 
                     current_info.model.c_str(), current_info.brand.c_str());
            std::thread([package_name = std::string(package_name)]() {
                killGmsProcesses(package_name.c_str());
            }).detach();
        }

        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::optional<DeviceInfo> spoof_info;

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
            build_soc_manufacturerField = env->GetStaticFieldID(buildClass, "SOC_MANUFACTURER", "Ljava/lang/String;");
            build_soc_modelField = env->GetStaticFieldID(buildClass, "SOC_MODEL", "Ljava/lang/String;");
            build_tagsField = env->GetStaticFieldID(buildClass, "TAGS", "Ljava/lang/String;");
            build_timeField = env->GetStaticFieldID(buildClass, "TIME", "J");
            build_typeField = env->GetStaticFieldID(buildClass, "TYPE", "Ljava/lang/String;");
            build_userField = env->GetStaticFieldID(buildClass, "USER", "Ljava/lang/String;");

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
                if (buildClass) env->DeleteGlobalRef(buildClass);
                if (versionClass) env->DeleteGlobalRef(versionClass);
                buildClass = nullptr;
                versionClass = nullptr;
            }
        });
    }

    void ensureOriginalInfo() {
        if (!buildClass) return;
        std::call_once(original_once, [&] {
            auto getStr = [&](jfieldID field) -> std::string {
                if (!field) return "";
                jstring js = (jstring)env->GetStaticObjectField(buildClass, field);
                if (!js) {
                    if (env->ExceptionCheck()) env->ExceptionClear();
                    return "";
                }
                const char* str = env->GetStringUTFChars(js, nullptr);
                if (!str) {
                    env->DeleteLocalRef(js);
                    if (env->ExceptionCheck()) env->ExceptionClear();
                    return "";
                }
                std::string result(str);
                env->ReleaseStringUTFChars(js, str);
                env->DeleteLocalRef(js);
                return result;
            };

            auto getInt = [&](jfieldID field) -> int {
                if (!field || !versionClass) return 0;
                return env->GetStaticIntField(versionClass, field);
            };

            auto getLong = [&](jfieldID field) -> int64_t {
                if (!field || !buildClass) return 0;
                return env->GetStaticLongField(buildClass, field);
            };

            original_info.model = getStr(build_modelField);
            original_info.brand = getStr(build_brandField);
            original_info.device = getStr(build_deviceField);
            original_info.manufacturer = getStr(build_manufacturerField);
            original_info.fingerprint = getStr(build_fingerprintField);
            original_info.product = getStr(build_productField);
            original_info.board = getStr(build_boardField);
            original_info.bootloader = getStr(build_bootloaderField);
            original_info.hardware = getStr(build_hardwareField);
            original_info.id = getStr(build_idField);
            original_info.display = getStr(build_displayField);
            original_info.host = getStr(build_hostField);
            original_info.odm_sku = getStr(build_odm_skuField);
            original_info.sku = getStr(build_skuField);
            original_info.soc_manufacturer = getStr(build_soc_manufacturerField);
            original_info.soc_model = getStr(build_soc_modelField);
            original_info.tags = getStr(build_tagsField);
            original_info.time = getLong(build_timeField);
            original_info.type = getStr(build_typeField);
            original_info.user = getStr(build_userField);
            original_info.version_codename = getStr(build_version_codenameField);
            original_info.version_incremental = getStr(build_version_incrementalField);
            original_info.version_sdk = getStr(build_version_sdkField);
            original_info.version_sdk_int_full = getInt(build_version_sdk_int_fullField);
            original_info.version_security_patch = getStr(build_version_security_patchField);
            original_info.version_release_or_codename = getStr(build_version_release_or_codenameField);
            original_info.version_release_or_preview_display = getStr(build_version_release_or_preview_displayField);

            if (versionClass) {
                if (build_version_releaseField) {
                    original_info.android_version = getStr(build_version_releaseField);
                }

                if (build_version_sdk_intField) {
                    original_info.version_sdk_int = getInt(build_version_sdk_intField);
                }
            }
            SPOOF_LOG("Original device info captured: %s (%s)", original_info.model.c_str(), original_info.brand.c_str());
        });
    }

    void reloadIfNeeded() {
        struct stat file_stat;
        if (stat(config_file.c_str(), &file_stat) != 0) {
            ERROR_LOG("Config missing: %s", config_file.c_str());
            return;
        }

        time_t current_mtime = file_stat.st_mtime;
        if (current_mtime == last_config_mtime) {
            return;
        }

        std::ifstream file(config_file);
        if (!file.is_open()) {
            ERROR_LOG("Failed to open config");
            return;
        }

        try {
            json config = json::parse(file);

            std::string device_key = "COPG";
            if (config.contains(device_key) && config[device_key].is_object()) {
                auto device = config[device_key];
                DeviceInfo info;
                info.brand = device.value("BRAND", "");
                info.device = device.value("DEVICE", "");
                info.manufacturer = device.value("MANUFACTURER", "");
                info.model = device.value("MODEL", "");
                info.fingerprint = device.value("FINGERPRINT", "");
                info.product = device.value("PRODUCT", info.brand);
                info.board = device.value("BOARD", info.model);
                info.bootloader = device.value("BOOTLOADER", "unknown");
                info.hardware = device.value("HARDWARE", info.model);
                info.id = device.value("ID", "");
                info.display = device.value("DISPLAY", "");
                info.host = device.value("HOST", "");
                info.odm_sku = device.value("ODM_SKU", info.model);
                info.sku = device.value("SKU", "unknown");
                info.soc_manufacturer = device.value("SOC_MANUFACTURER", "unknown");
                info.soc_model = device.value("SOC_MODEL", "unknown");
                info.tags = device.value("TAGS", "release-keys");
                info.type = device.value("TYPE", "user");
                info.user = device.value("USER", "");
                info.version_codename = device.value("CODENAME", "REL");
                info.version_incremental = device.value("INCREMENTAL", "");
                info.version_security_patch = device.value("SECURITY_PATCH", "");

                if (device.contains("TIMESTAMP")) {
                    const auto& device_timestamp = device["TIMESTAMP"];
                    try {
                    if (device_timestamp.is_number_integer()) {
                        info.time = static_cast<int64_t>(device_timestamp.get<int64_t>()) * 1000;
                    } else if (device_timestamp.is_string()) {
                        info.time = std::stoll(device_timestamp.get<std::string>()) * 1000;
                    } catch (const std::exception& e) {
                        WARN_LOG("Failed to parse TIMESTAMP: %s", e.what());
                    }
                }

                if (device.contains("ANDROID_VERSION")) {
                    const auto& device_android_version = device["TIMESTAMP"];
                    try {
                        if (device_android_version.is_string()) {
                            info.android_version = device_android_version.get<std::string>();
                        } else if (device_android_version.is_number()) {
                            info.android_version = std::to_string(device_android_version.get<int>());
                        }
                    } catch (const std::exception& e) {
                        WARN_LOG("Failed to parse ANDROID_VERSION: %s", e.what());
                    }
                }
    
                if (device.contains("SDK_INT")) {
                    const auto& device_sdk_int = device["TIMESTAMP"];
                    try {
                        if (device_sdk_int.is_number()) {
                            info.version_sdk_int = device_sdk_int.get<int>();
                        } else if (device_sdk_int.is_string()) {
                            std::string sdk_str = device_sdk_int.get<std::string>();
                            if (!sdk_str.empty()) {
                                info.version_sdk_int = std::stoi(sdk_str);
                            }
                        }
                        
                        info.version_sdk = std::to_string(info.version_sdk_int);
                        info.version_release_or_codename = std::to_string(info.version_sdk_int);
                        info.version_release_or_preview_display = std::to_string(info.version_sdk_int);
                        info.version_sdk_int_full = info.version_sdk_int * 100000;

                    } catch (const std::exception& e) {
                        WARN_LOG("Failed to parse SDK_INT: %s", e.what());
                    }
                }

                {
                    std::lock_guard<std::mutex> lock(info_mutex);
                    spoof_info = info;
                }
   
                last_config_mtime = current_mtime;
                INFO_LOG("Loaded device: %s", 
                        info.device.c_str());
            } else {
                ERROR_LOG("Device error: nothing found");
            }        
        } catch (const json::exception& e) {
            ERROR_LOG("JSON error: %s", e.what());
        } catch (const std::exception& e) {
            ERROR_LOG("Config error: %s", e.what());
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

        auto setLong = [&](jfieldID field, int64_t value) {
            if (!field) return;
            env->SetStaticLongField(buildClass, field, value);
            if (env->ExceptionCheck()) {
                env->ExceptionClear();
            }
        };

        setStr(build_modelField, info.model);
        setStr(build_brandField, info.brand);
        setStr(build_deviceField, info.device);
        setStr(build_manufacturerField, info.manufacturer);
        setStr(build_fingerprintField, info.fingerprint);
        setStr(build_productField, info.product);
        setStr(build_boardField, info.board);
        setStr(build_bootloaderField, info.bootloader);
        setStr(build_hardwareField, info.hardware);
        setStr(build_idField, info.id);
        setStr(build_displayField, info.display);
        setStr(build_hostField, info.host);
        setStr(build_odm_skuField, info.odm_sku);
        setStr(build_skuField, info.sku);
        setStr(build_soc_manufacturerField, info.soc_manufacturer);
        setStr(build_soc_modelField, info.soc_model);
        setStr(build_tagsField, info.tags);
        setLong(build_timeField, info.time);
        setStr(build_typeField, info.type);
        setStr(build_userField, info.user);
        setStr(build_version_codenameField, info.version_codename);
        setStr(build_version_incrementalField, info.version_incremental);
        setStr(build_version_sdkField, info.version_sdk);
        setInt(build_version_sdk_int_fullField, info.version_sdk_int_full);
        setStr(build_version_security_patchField, info.version_security_patch);
        setStr(build_version_releaseField, info.android_version);
        setInt(build_version_sdk_intField, info.version_sdk_int);
        setInt(build_version_release_or_codenameField, info.version_release_or_codename);
        setInt(build_version_release_or_preview_displayField, info.version_release_or_preview_display);

        SPOOF_LOG("Device spoofed: %s (%s)", info.model.c_str(), info.brand.c_str());
    }
};

REGISTER_ZYGISK_MODULE(COPGModule)
