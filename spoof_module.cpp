#include <jni.h>
#include <string>
#include <zygisk.hh>
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
    std::string build_id;
    std::string display;
    std::string product;
    std::string version_release;
    std::string serial;
    std::string cpuinfo;
    std::string serial_content;
};

struct GameSettings {
    int original_zen_mode = -1;
    int original_brightness_mode = -1;
    bool dnd_changed = false;
    bool brightness_changed = false;
};

// Static function pointers for hooks
typedef int (*orig_prop_get_t)(const char*, char*, const char*);
static orig_prop_get_t orig_prop_get = nullptr;
typedef ssize_t (*orig_read_t)(int, void*, size_t);
static orig_read_t orig_read = nullptr;
typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;

// Static global variables
static DeviceInfo current_info;
static jclass buildClass = nullptr;
static jclass versionClass = nullptr;
static jfieldID modelField = nullptr;
static jfieldID brandField = nullptr;
static jfieldID deviceField = nullptr;
static jfieldID manufacturerField = nullptr;
static jfieldID fingerprintField = nullptr;
static jfieldID buildIdField = nullptr;
static jfieldID displayField = nullptr;
static jfieldID productField = nullptr;
static jfieldID versionReleaseField = nullptr;
static jfieldID sdkIntField = nullptr;
static jfieldID serialField = nullptr;

class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        LOGD("onLoad called");

        if (!buildClass) {
            buildClass = (jclass)env->NewGlobalRef(env->FindClass("android/os/Build"));
            if (buildClass) {
                modelField = env->GetStaticFieldID(buildClass, "MODEL", "Ljava/lang/String;");
                brandField = env->GetStaticFieldID(buildClass, "BRAND", "Ljava/lang/String;");
                deviceField = env->GetStaticFieldID(buildClass, "DEVICE", "Ljava/lang/String;");
                manufacturerField = env->GetStaticFieldID(buildClass, "MANUFACTURER", "Ljava/lang/String;");
                fingerprintField = env->GetStaticFieldID(buildClass, "FINGERPRINT", "Ljava/lang/String;");
                buildIdField = env->GetStaticFieldID(buildClass, "ID", "Ljava/lang/String;");
                displayField = env->GetStaticFieldID(buildClass, "DISPLAY", "Ljava/lang/String;");
                productField = env->GetStaticFieldID(buildClass, "PRODUCT", "Ljava/lang/String;");
                serialField = env->GetStaticFieldID(buildClass, "SERIAL", "Ljava/lang/String;");
            } else {
                LOGE("Failed to find android/os/Build class");
            }
        }
        if (!versionClass) {
            versionClass = (jclass)env->NewGlobalRef(env->FindClass("android/os/Build$VERSION"));
            if (versionClass) {
                versionReleaseField = env->GetStaticFieldID(versionClass, "RELEASE", "Ljava/lang/String;");
                sdkIntField = env->GetStaticFieldID(versionClass, "SDK_INT", "I");
            } else {
                LOGE("Failed to find android/os/Build$VERSION class");
            }
        }

        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            orig_prop_get = (orig_prop_get_t)dlsym(handle, "__system_property_get");
            orig_read = (orig_read_t)dlsym(handle, "read");
            dlclose(handle);
        } else {
            LOGE("Failed to dlopen libc.so");
        }

        hookNativeGetprop();
        hookNativeRead();
        hookJniSetStaticObjectField();
        loadConfig();
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }
        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }
        std::string pkg_str(package_name);
        LOGD("preAppSpecialize for package: %s", pkg_str.c_str());
        auto it = package_map.find(pkg_str);
        if (it == package_map.end()) {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            current_info = it->second;
            spoofDevice(current_info);
            spoofSystemProperties(current_info);
            manageGameSettings(pkg_str);
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name || package_map.empty() || !buildClass) return;
        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) return;
        std::string pkg_str(package_name);
        LOGD("postAppSpecialize for package: %s", pkg_str.c_str());
        auto it = package_map.find(pkg_str);
        if (it != package_map.end()) {
            current_info = it->second;
            spoofDevice(current_info);
            spoofSystemProperties(current_info);
            manageGameSettings(pkg_str);
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

    ~SpoofModule() {
        LOGD("Destructor called, restoring settings");
        for (const auto& [pkg, settings] : active_settings) {
            restoreOriginalSettings(settings);
        }
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;
    static std::unordered_map<std::string, GameSettings> active_settings;

    void loadConfig() {
        std::ifstream file("/data/adb/modules/COPG/config.json");
        if (!file.is_open()) {
            LOGE("Failed to open config.json");
            return;
        }
        try {
            json config = json::parse(file);
            for (auto& [key, value] : config.items()) {
                if (key.find("_DEVICE") != std::string::npos) continue;
                auto packages = value.get<std::vector<std::string>>();
                std::string device_key = key + "_DEVICE";
                if (!config.contains(device_key)) continue;
                auto device = config[device_key];

                DeviceInfo info;
                info.brand = device["BRAND"].get<std::string>();
                info.device = device["DEVICE"].get<std::string>();
                info.manufacturer = device["MANUFACTURER"].get<std::string>();
                info.model = device["MODEL"].get<std::string>();
                info.fingerprint = device.contains("FINGERPRINT") ? 
                    device["FINGERPRINT"].get<std::string>() : "generic/brand/device:13/TQ3A.230805.001/123456:user/release-keys";
                info.build_id = device.contains("BUILD_ID") ? device["BUILD_ID"].get<std::string>() : "";
                info.display = device.contains("DISPLAY") ? device["DISPLAY"].get<std::string>() : "";
                info.product = device.contains("PRODUCT") ? device["PRODUCT"].get<std::string>() : info.device;
                info.version_release = device.contains("VERSION_RELEASE") ? 
                    device["VERSION_RELEASE"].get<std::string>() : "";
                info.serial = device.contains("SERIAL") ? device["SERIAL"].get<std::string>() : "";
                info.cpuinfo = device.contains("CPUINFO") ? device["CPUINFO"].get<std::string>() : "";
                info.serial_content = device.contains("SERIAL_CONTENT") ? device["SERIAL_CONTENT"].get<std::string>() : "";

                for (const auto& pkg : packages) {
                    package_map[pkg] = info;
                    LOGD("Loaded package: %s", pkg.c_str());
                }
            }
        } catch (const json::exception& e) {
            LOGE("JSON parse error: %s", e.what());
        }
        file.close();
    }

    void spoofDevice(const DeviceInfo& info) {
        if (modelField) env->SetStaticObjectField(buildClass, modelField, env->NewStringUTF(info.model.c_str()));
        if (brandField) env->SetStaticObjectField(buildClass, brandField, env->NewStringUTF(info.brand.c_str()));
        if (deviceField) env->SetStaticObjectField(buildClass, deviceField, env->NewStringUTF(info.device.c_str()));
        if (manufacturerField) env->SetStaticObjectField(buildClass, manufacturerField, env->NewStringUTF(info.manufacturer.c_str()));
        if (fingerprintField) env->SetStaticObjectField(buildClass, fingerprintField, env->NewStringUTF(info.fingerprint.c_str()));
        if (buildIdField && !info.build_id.empty()) env->SetStaticObjectField(buildClass, buildIdField, env->NewStringUTF(info.build_id.c_str()));
        if (displayField && !info.display.empty()) env->SetStaticObjectField(buildClass, displayField, env->NewStringUTF(info.display.c_str()));
        if (productField && !info.product.empty()) env->SetStaticObjectField(buildClass, productField, env->NewStringUTF(info.product.c_str()));
        if (versionReleaseField && !info.version_release.empty()) 
            env->SetStaticObjectField(versionClass, versionReleaseField, env->NewStringUTF(info.version_release.c_str()));
        if (sdkIntField && !info.version_release.empty()) 
            env->SetStaticIntField(versionClass, sdkIntField, info.version_release == "13" ? 33 : 34);
        if (serialField && !info.serial.empty()) env->SetStaticObjectField(buildClass, serialField, env->NewStringUTF(info.serial.c_str()));
    }

    void spoofSystemProperties(const DeviceInfo& info) {
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
                } else {
                    LOGE("mprotect failed for __system_property_get");
                }
            }
            dlclose(handle);
        } else {
            LOGE("Failed to dlopen libc.so for hooking __system_property_get");
        }
    }

    static ssize_t hooked_read(int fd, void* buf, size_t count) {
        if (!orig_read) return -1;

        char path[256];
        snprintf(path, sizeof(path), "/proc/self/fd/%d", fd);
        char real_path[256];
        ssize_t len = readlink(path, real_path, sizeof(real_path) - 1);
        if (len != -1) {
            real_path[len] = '\0';
            std::string file_path(real_path);

            if (file_path == "/proc/cpuinfo" && !current_info.cpuinfo.empty()) {
                size_t bytes_to_copy = std::min(count, current_info.cpuinfo.length());
                memcpy(buf, current_info.cpuinfo.c_str(), bytes_to_copy);
                return bytes_to_copy;
            } else if (file_path == "/sys/devices/soc0/serial_number" && !current_info.serial_content.empty()) {
                size_t bytes_to_copy = std::min(count, current_info.serial_content.length());
                memcpy(buf, current_info.serial_content.c_str(), bytes_to_copy);
                return bytes_to_copy;
            }
        }

        return orig_read(fd, buf, count);
    }

    void hookNativeRead() {
        if (!orig_read) return;
        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            void* sym = dlsym(handle, "read");
            if (sym) {
                size_t page_size = sysconf(_SC_PAGE_SIZE);
                void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
                if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == 0) {
                    *(void**)&orig_read = (void*)hooked_read;
                    mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
                } else {
                    LOGE("mprotect failed for read");
                }
            }
            dlclose(handle);
        } else {
            LOGE("Failed to dlopen libc.so for hooking read");
        }
    }

    static void hooked_set_static_object_field(JNIEnv* env, jclass clazz, jfieldID fieldID, jobject value) {
        if (clazz == buildClass) {
            if (fieldID == modelField || fieldID == brandField || fieldID == deviceField ||
                fieldID == manufacturerField || fieldID == fingerprintField || fieldID == buildIdField ||
                fieldID == displayField || fieldID == productField || fieldID == serialField) {
                return;
            }
        } else if (clazz == versionClass) {
            if (fieldID == versionReleaseField) {
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
                } else {
                    LOGE("mprotect failed for JNI_SetStaticObjectField");
                }
            }
            dlclose(handle);
        } else {
            LOGE("Failed to dlopen libandroid_runtime.so");
        }
    }

    void manageGameSettings(const std::string& package_name) {
        if (package_map.find(package_name) == package_map.end()) {
            LOGD("Package %s not in package_map, skipping", package_name.c_str());
            return;
        }

        LOGD("Attempting to read /data/adb/copg_state for %s", package_name.c_str());
        FILE* pipe = popen("/system/bin/su -c 'cat /data/adb/copg_state'", "r");
        if (!pipe) {
            LOGE("Failed to popen /system/bin/su -c 'cat /data/adb/copg_state' for package %s", package_name.c_str());
            return;
        }

        std::unordered_map<std::string, int> toggles;
        char buffer[128];
        while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
            std::string line(buffer);
            size_t pos = line.find('=');
            if (pos != std::string::npos) {
                std::string key = line.substr(0, pos);
                std::string value = line.substr(pos + 1);
                value.erase(value.find_last_not_of(" \n\r\t") + 1);
                try {
                    toggles[key] = std::stoi(value);
                    LOGD("Read toggle: %s = %d", key.c_str(), toggles[key]);
                } catch (...) {
                    LOGE("Failed to parse value for key: %s", key.c_str());
                }
            }
        }
        int pipe_result = pclose(pipe);
        if (pipe_result != 0) {
            LOGE("pclose failed with result: %d for package %s (likely command not found)", pipe_result, package_name.c_str());
        } else {
            LOGD("Successfully read /data/adb/copg_state for %s", package_name.c_str());
        }

        GameSettings& settings = active_settings[package_name];
        LOGD("Managing settings for package: %s", package_name.c_str());

        // Get original settings with root
        if (settings.original_zen_mode == -1) {
            FILE* zen_pipe = popen("/system/bin/su -c 'settings get global zen_mode'", "r");
            if (zen_pipe) {
                char zen_buffer[128];
                if (fgets(zen_buffer, sizeof(zen_buffer), zen_pipe) != nullptr) {
                    settings.original_zen_mode = atoi(zen_buffer);
                    LOGD("Original zen_mode: %d", settings.original_zen_mode);
                } else {
                    LOGE("Failed to read zen_mode output");
                    settings.original_zen_mode = 0; // Fallback
                }
                pclose(zen_pipe);
            } else {
                LOGE("Failed to popen /system/bin/su -c 'settings get global zen_mode'");
                settings.original_zen_mode = 0; // Fallback
            }
        }

        if (settings.original_brightness_mode == -1) {
            FILE* bright_pipe = popen("/system/bin/su -c 'settings get system screen_brightness_mode'", "r");
            if (bright_pipe) {
                char bright_buffer[128];
                if (fgets(bright_buffer, sizeof(bright_buffer), bright_pipe) != nullptr) {
                    settings.original_brightness_mode = atoi(bright_buffer);
                    LOGD("Original brightness_mode: %d", settings.original_brightness_mode);
                } else {
                    LOGE("Failed to read screen_brightness_mode output");
                    settings.original_brightness_mode = 1; // Fallback
                }
                pclose(bright_pipe);
            } else {
                LOGE("Failed to popen /system/bin/su -c 'settings get system screen_brightness_mode'");
                settings.original_brightness_mode = 1; // Fallback
            }
        }

        // Apply DND settings with root
        if (toggles.find("DND_ON") != toggles.end()) {
            if (toggles["DND_ON"] == 1 && settings.original_zen_mode != 1) {
                int result = system("/system/bin/su -c 'cmd notification set_dnd on'");
                if (result == 0) {
                    settings.dnd_changed = true;
                    LOGD("DND turned ON for %s", package_name.c_str());
                } else {
                    LOGE("Failed to turn DND on for %s, result: %d", package_name.c_str(), result);
                }
            } else {
                LOGD("DND not enabled or already on for %s (original: %d)", package_name.c_str(), settings.original_zen_mode);
            }
        }

        // Apply brightness settings with root
        if (toggles.find("AUTO_BRIGHTNESS_OFF") != toggles.end()) {
            if (toggles["AUTO_BRIGHTNESS_OFF"] == 1 && settings.original_brightness_mode != 0) {
                int result = system("/system/bin/su -c 'settings put system screen_brightness_mode 0'");
                if (result == 0) {
                    settings.brightness_changed = true;
                    LOGD("Auto-brightness turned OFF for %s", package_name.c_str());
                } else {
                    LOGE("Failed to turn off auto-brightness for %s, result: %d", package_name.c_str(), result);
                }
            } else {
                LOGD("Auto-brightness not disabled or already off for %s (original: %d)", package_name.c_str(), settings.original_brightness_mode);
            }
        }
    }

    void restoreOriginalSettings(const GameSettings& settings) {
        if (settings.dnd_changed && settings.original_zen_mode == 0) {
            int result = system("/system/bin/su -c 'cmd notification set_dnd off'");
            if (result == 0) {
                LOGD("Restored DND to OFF");
            } else {
                LOGE("Failed to restore DND to OFF, result: %d", result);
            }
        }
        if (settings.brightness_changed && settings.original_brightness_mode == 1) {
            int result = system("/system/bin/su -c 'settings put system screen_brightness_mode 1'");
            if (result == 0) {
                LOGD("Restored auto-brightness to ON");
            } else {
                LOGE("Failed to restore auto-brightness to ON, result: %d", result);
            }
        }
    }
};

std::unordered_map<std::string, GameSettings> SpoofModule::active_settings;

REGISTER_ZYGISK_MODULE(SpoofModule)
