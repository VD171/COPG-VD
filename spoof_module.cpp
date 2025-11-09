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
#include <sys/socket.h>
#include <sys/un.h>
#include <vector>
#include <map>

using json = nlohmann::json;

#define LOG_TAG "SpoofModule"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static bool debug_mode = true;

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

static std::string findResetpropPath() {
    const char* possible_paths[] = {
        "/data/adb/ksu/bin/resetprop",
        "/data/adb/magisk/resetprop",
        "/debug_ramdisk/resetprop",
        "/data/adb/ap/bin/resetprop",
        "/system/bin/resetprop",
        "/vendor/bin/resetprop",
        nullptr
    };
    
    for (int i = 0; possible_paths[i] != nullptr; i++) {
        if (access(possible_paths[i], X_OK) == 0) {
            LOGD("Found resetprop at: %s", possible_paths[i]);
            return possible_paths[i];
        }
    }
    
    FILE* pipe = popen("which resetprop", "r");
    if (pipe) {
        char path[256];
        if (fgets(path, sizeof(path), pipe) != nullptr) {
            size_t len = strlen(path);
            if (len > 0 && path[len-1] == '\n') {
                path[len-1] = '\0';
            }
            if (access(path, X_OK) == 0) {
                LOGD("Found resetprop via which: %s", path);
                pclose(pipe);
                return path;
            }
        }
        pclose(pipe);
    }
    
    LOGE("Could not find resetprop in any known location!");
    return "";
}

static std::string getSystemProperty(const std::string& prop) {
    std::string cmd = "/system/bin/getprop " + prop;
    FILE* pipe = popen(cmd.c_str(), "r");
    if (!pipe) {
        LOGE("Failed to execute getprop for %s", prop.c_str());
        return "";
    }
    
    char buffer[128];
    std::string result = "";
    if (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        result = buffer;
    }
    pclose(pipe);
    
    result.erase(std::remove(result.begin(), result.end(), '\n'), result.end());
    result.erase(std::remove(result.begin(), result.end(), '\r'), result.end());
    
    LOGD("getprop %s: %s", prop.c_str(), result.c_str());
    return result;
}

static void companion(int fd) {
    LOGD("[COMPANION] Companion started");
    
    std::string resetprop_path = findResetpropPath();
    if (resetprop_path.empty()) {
        LOGE("[COMPANION] No resetprop found, companion cannot function");
        close(fd);
        return;
    }
    
    char buffer[2048];
    ssize_t bytes = read(fd, buffer, sizeof(buffer)-1);
    
    if (bytes > 0) {
        buffer[bytes] = '\0';
        std::string command = buffer;
        
        LOGD("[COMPANION] Executing: %s", command.c_str());
        
        std::string full_cmd = resetprop_path + " " + command;
        int result = system(full_cmd.c_str());
        
        LOGD("[COMPANION] Result: %d", result);
        write(fd, &result, sizeof(result));
    }
    
    close(fd);
}

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
                
                backupOriginalProps();
                spoofDevice(current_info);
                spoofSystemProps(current_info);
                
                should_close = false;
            }
        }

        if (should_close) {
            LOGD("Package %s not found in config, closing module", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
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
                
                restoreOriginalProps();
            }
        }

        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        LOGD("Set DLCLOSE in postAppSpecialize for extra stealth");
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;
    std::map<std::string, std::string> original_props;
    bool props_backed_up = false;

    void backupOriginalProps() {
        if (props_backed_up) return;
        
        const char* props[] = {
            "ro.product.brand", "ro.product.manufacturer", "ro.product.model",
            "ro.product.device", "ro.product.name", "ro.build.fingerprint"
        };
        
        for (const char* prop : props) {
            std::string value = getSystemProperty(prop);
            if (!value.empty()) {
                original_props[prop] = value;
                LOGD("Backed up %s: %s", prop, value.c_str());
            }
        }
        props_backed_up = true;
        LOGD("Original props backed up");
    }

    void restoreOriginalProps() {
        if (!props_backed_up) {
            LOGD("No props to restore");
            return;
        }
        
        LOGD("Restoring original props");
        for (const auto& [prop, value] : original_props) {
            if (!value.empty()) {
                std::string cmd = prop + " \"" + value + "\"";
                if (executeResetprop(cmd)) {
                    LOGD("Restored %s to %s", prop.c_str(), value.c_str());
                } else {
                    LOGE("Failed to restore %s", prop.c_str());
                }
            }
        }
        props_backed_up = false;
        original_props.clear();
        LOGD("All original props restored");
    }

    bool executeResetprop(const std::string& args) {
        auto fd = api->connectCompanion();
        if (fd < 0) {
            LOGE("Failed to connect to companion");
            return false;
        }
        
        write(fd, args.c_str(), args.size());
        
        int result = -1;
        read(fd, &result, sizeof(result));
        close(fd);
        
        return result == 0;
    }

    void spoofSystemProps(const DeviceInfo& info) {
        LOGD("Starting system props spoofing with resetprop");
        
        const char* commands[] = {
            "ro.product.brand",
            "ro.product.manufacturer", 
            "ro.product.model",
            "ro.product.device",
            "ro.product.name",
            "ro.build.fingerprint"
        };
        
        const char* values[] = {
            info.brand.c_str(),
            info.manufacturer.c_str(),
            info.model.c_str(),
            info.device.c_str(),
            info.product.c_str(),
            info.fingerprint.c_str()
        };
        
        const int num_commands = sizeof(commands) / sizeof(commands[0]);
        
        for (int i = 0; i < num_commands; i++) {
            std::string cmd = std::string(commands[i]) + " \"" + values[i] + "\"";
            if (executeResetprop(cmd)) {
                LOGD("Resetprop successful: %s", cmd.c_str());
            } else {
                LOGE("Resetprop failed: %s", cmd.c_str());
            }
            usleep(1000);
        }
        
        LOGD("System props spoofing completed");
    }

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
REGISTER_ZYGISK_COMPANION(companion)
