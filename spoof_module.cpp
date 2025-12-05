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
#include <unordered_set>
#include <fcntl.h>
#include <sstream>

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

struct BuildPropValues {
    std::string ro_product_brand;
    std::string ro_product_manufacturer;
    std::string ro_product_model;
    std::string ro_product_device;
    std::string ro_product_name;
    std::string ro_build_fingerprint;
};

static DeviceInfo current_info;
static BuildPropValues original_build_props;
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
static const std::string config_path = "/data/adb/modules/COPG/COPG.json";
static const char* spoof_file_path = "/data/adb/modules/COPG/cpuinfo_spoof";

static std::unordered_set<std::string> cpu_blacklist;
static std::unordered_set<std::string> cpu_only_packages;

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
            return std::string(possible_paths[i]);
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
                return std::string(path);
            }
        }
        pclose(pipe);
    }
    
    LOGE("Could not find resetprop in any known location!");
    return "";
}

static std::string readBuildPropValue(const std::string& prop_name) {
    const char* build_prop_paths[] = {
        "/system/build.prop",
        "/vendor/build.prop",
        "/product/build.prop",
        "/system_ext/build.prop",
        "/odm/build.prop",
        nullptr
    };
    
    for (int i = 0; build_prop_paths[i] != nullptr; i++) {
        FILE* file = fopen(build_prop_paths[i], "r");
        if (!file) continue;
        
        char line[512];
        std::string search_str = prop_name + "=";
        
        while (fgets(line, sizeof(line), file)) {
            if (strstr(line, search_str.c_str()) == line) {
                std::string value = line + search_str.length();
                size_t newline_pos = value.find('\n');
                if (newline_pos != std::string::npos) {
                    value.erase(newline_pos);
                }
                
                size_t comment_pos = value.find('#');
                if (comment_pos != std::string::npos) {
                    value.erase(comment_pos);
                }
                
                fclose(file);
                
                while (!value.empty() && value.back() == '\r') {
                    value.pop_back();
                }
                
                LOGD("Read %s=%s from %s", prop_name.c_str(), value.c_str(), build_prop_paths[i]);
                return value;
            }
        }
        
        fclose(file);
    }
    
    LOGD("Property %s not found in build.prop files", prop_name.c_str());
    return "";
}

static void readOriginalBuildProps() {
    original_build_props.ro_product_brand = readBuildPropValue("ro.product.brand");
    original_build_props.ro_product_manufacturer = readBuildPropValue("ro.product.manufacturer");
    original_build_props.ro_product_model = readBuildPropValue("ro.product.model");
    original_build_props.ro_product_device = readBuildPropValue("ro.product.device");
    original_build_props.ro_product_name = readBuildPropValue("ro.product.name");
    original_build_props.ro_build_fingerprint = readBuildPropValue("ro.build.fingerprint");
    
    LOGD("Original build props loaded:");
    LOGD("  brand: %s", original_build_props.ro_product_brand.c_str());
    LOGD("  manufacturer: %s", original_build_props.ro_product_manufacturer.c_str());
    LOGD("  model: %s", original_build_props.ro_product_model.c_str());
    LOGD("  device: %s", original_build_props.ro_product_device.c_str());
    LOGD("  product: %s", original_build_props.ro_product_name.c_str());
    LOGD("  fingerprint: %s", original_build_props.ro_build_fingerprint.c_str());
}

static void companion(int fd) {
    LOGD("[COMPANION] Companion started");
    
    char buffer[256];
    ssize_t bytes = read(fd, buffer, sizeof(buffer)-1);
    
    if (bytes > 0) {
        buffer[bytes] = '\0';
        std::string command = buffer;
        
        LOGD("[COMPANION] Command: %s", command.c_str());
        
        int result = -1;
        
        if (command.find("resetprop") == 0) {
            std::string resetprop_path = findResetpropPath();
            if (!resetprop_path.empty()) {
                std::string full_cmd = resetprop_path + " " + command.substr(9);
                result = system(full_cmd.c_str());
                LOGD("[COMPANION] Resetprop result: %d", result);
            }
        } else if (command == "unmount_spoof") {
            result = system("/system/bin/umount /proc/cpuinfo 2>/dev/null");
            LOGD("[COMPANION] Unmount result: %d", result);
        } else if (command == "mount_spoof") {
            if (access(spoof_file_path, F_OK) == 0) {
                system("/system/bin/umount /proc/cpuinfo 2>/dev/null");
                char mount_cmd[512];
                snprintf(mount_cmd, sizeof(mount_cmd), 
                        "/system/bin/mount --bind %s /proc/cpuinfo", spoof_file_path);
                result = system(mount_cmd);
                LOGD("[COMPANION] Mount result: %d", result);
            } else {
                LOGE("[COMPANION] Spoof file not found: %s", spoof_file_path);
            }
        } else if (command == "read_build_props") {
            readOriginalBuildProps();
            result = 0;
            LOGD("[COMPANION] Read original build props");
        } else if (command == "restore_build_props") {
            readOriginalBuildProps();
            
            std::string resetprop_path = findResetpropPath();
            if (!resetprop_path.empty()) {
                if (!original_build_props.ro_product_brand.empty()) {
                    std::string cmd = resetprop_path + " ro.product.brand " + original_build_props.ro_product_brand;
                    system(cmd.c_str());
                }
                if (!original_build_props.ro_product_manufacturer.empty()) {
                    std::string cmd = resetprop_path + " ro.product.manufacturer " + original_build_props.ro_product_manufacturer;
                    system(cmd.c_str());
                }
                if (!original_build_props.ro_product_model.empty()) {
                    std::string cmd = resetprop_path + " ro.product.model " + original_build_props.ro_product_model;
                    system(cmd.c_str());
                }
                if (!original_build_props.ro_product_device.empty()) {
                    std::string cmd = resetprop_path + " ro.product.device " + original_build_props.ro_product_device;
                    system(cmd.c_str());
                }
                if (!original_build_props.ro_product_name.empty()) {
                    std::string cmd = resetprop_path + " ro.product.name " + original_build_props.ro_product_name;
                    system(cmd.c_str());
                }
                if (!original_build_props.ro_build_fingerprint.empty()) {
                    std::string cmd = resetprop_path + " ro.build.fingerprint " + original_build_props.ro_build_fingerprint;
                    system(cmd.c_str());
                }
            }
            
            result = 0;
            LOGD("[COMPANION] Restored original build props");
        }
        
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
        
        executeCompanionCommand("read_build_props");
        
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
        bool current_needs_device_spoof = false;
        bool current_needs_cpu_spoof = false;
        bool should_unmount_cpu = false;
        bool is_blacklisted = false;
        
        {
            std::lock_guard<std::mutex> lock(info_mutex);
            
            DeviceInfo device_info;
            std::string package_setting = "";
            bool found_in_device_list = false;

            for (auto& device_entry : device_packages) {
                auto it = device_entry.second.find(package_name);
                if (it != device_entry.second.end()) {
                    found_in_device_list = true;
                    package_setting = it->second;
                    current_needs_device_spoof = true;
                    device_info = device_entry.first;
                    current_info = device_info;
                    
                    LOGD("Package %s - setting: %s", package_name, package_setting.c_str());
                    
                    if (package_setting == "with_cpu") {
                        current_needs_cpu_spoof = true;
                    } else if (package_setting == "blocked") {
                        should_unmount_cpu = true;
                    }
                    break;
                }
            }

            is_blacklisted = (cpu_blacklist.find(package_name) != cpu_blacklist.end());
            bool is_cpu_only = (cpu_only_packages.find(package_name) != cpu_only_packages.end());

            if (is_blacklisted) {
                should_unmount_cpu = true;
                LOGD("Package %s is in CPU blacklist", package_name);
            }

            if (!found_in_device_list && !is_blacklisted && is_cpu_only) {
                current_needs_cpu_spoof = true;
            }

            if (found_in_device_list && package_setting.empty() && !is_blacklisted && is_cpu_only) {
                current_needs_cpu_spoof = true;
            }

            LOGD("Final decision - device: %d, cpu: %d, unmount: %d, blacklist: %d, cpu_only: %d", 
                 current_needs_device_spoof, current_needs_cpu_spoof, should_unmount_cpu, 
                 is_blacklisted, is_cpu_only);

            // Restore original build props for blacklisted apps
            if (is_blacklisted) {
                executeCompanionCommand("restore_build_props");
                LOGD("Restored original build props for blacklisted package: %s", package_name);
            }

            if (current_needs_device_spoof) {
                spoofDevice(current_info);
                spoofSystemProps(current_info);
                should_close = false;
                LOGD("Device spoof applied for %s", package_name);
            }

            if (should_unmount_cpu) {
                executeCompanionCommand("unmount_spoof");
                LOGD("CPU spoof UNMOUNTED for %s", package_name);
            } else if (current_needs_cpu_spoof) {
                executeCompanionCommand("mount_spoof");
                LOGD("CPU spoof MOUNTED for %s", package_name);
            }

            if (current_needs_device_spoof || current_needs_cpu_spoof || is_blacklisted) {
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
        if (!args || !args->nice_name || device_packages.empty()) return;

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
            
            bool is_blacklisted = (cpu_blacklist.find(package_name) != cpu_blacklist.end());
            
            // Check if app is in blacklist and restore build props
            if (is_blacklisted) {
                executeCompanionCommand("restore_build_props");
                LOGD("Post-specialize: Restored original build props for blacklisted package: %s", package_name);
            }
            
            for (auto& device_entry : device_packages) {
                auto it = device_entry.second.find(package_name);
                if (it != device_entry.second.end()) {
                    current_info = device_entry.first;
                    LOGD("Post-specialize spoofing for %s: %s", package_name, current_info.model.c_str());
                    spoofDevice(current_info);
                    break;
                }
            }
        }

        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        LOGD("Set DLCLOSE in postAppSpecialize for extra stealth");
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::vector<std::pair<DeviceInfo, std::unordered_map<std::string, std::string>>> device_packages;

    std::pair<std::string, std::unordered_set<std::string>> parsePackageWithTags(const std::string& package_str) {
        std::string package_name = package_str;
        std::unordered_set<std::string> tags;
        
        package_name.erase(0, package_name.find_first_not_of(" \t"));
        package_name.erase(package_name.find_last_not_of(" \t") + 1);
        
        size_t colon_pos = package_str.find(':');
        if (colon_pos != std::string::npos && colon_pos < package_str.length() - 1) {
            package_name = package_str.substr(0, colon_pos);
            
            std::string tags_part = package_str.substr(colon_pos + 1);
            
            std::istringstream tag_stream(tags_part);
            std::string tag;
            while (std::getline(tag_stream, tag, ':')) {
                tag.erase(0, tag.find_first_not_of(" \t"));
                tag.erase(tag.find_last_not_of(" \t") + 1);
                
                if (!tag.empty()) {
                    tags.insert(tag);
                    LOGD("Found tag '%s' for package %s", tag.c_str(), package_name.c_str());
                }
            }
        }
        
        std::string tag_list;
        for (const auto& tag : tags) {
            if (!tag_list.empty()) tag_list += ", ";
            tag_list += tag;
        }
        LOGD("Package '%s' has %zu tags: %s", package_name.c_str(), tags.size(), tag_list.c_str());
        
        return {package_name, tags};
    }

    std::string getZygiskSettingFromTags(const std::unordered_set<std::string>& tags) {
        LOGD("Checking %zu tags for zygisk setting", tags.size());
        
        for (const auto& tag : tags) {
            LOGD("Processing tag: %s", tag.c_str());
        }
        
        if (tags.find("blocked") != tags.end()) {
            LOGD("Tag 'blocked' found, returning 'blocked'");
            return "blocked";
        } else if (tags.find("with_cpu") != tags.end()) {
            LOGD("Tag 'with_cpu' found, returning 'with_cpu'");
            return "with_cpu";
        }
        
        LOGD("No relevant tags found, returning empty");
        return "";
    }

    bool executeCompanionCommand(const std::string& command) {
        auto fd = api->connectCompanion();
        if (fd < 0) {
            LOGE("Failed to connect to companion");
            return false;
        }
        
        write(fd, command.c_str(), command.size());
        
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
            std::string cmd = std::string("resetprop ") + commands[i] + " \"" + values[i] + "\"";
            if (executeCompanionCommand(cmd)) {
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
            LOGE("Failed to open COPG.json at %s", config_path.c_str());
            return;
        }

        try {
            json config = json::parse(file);
            std::vector<std::pair<DeviceInfo, std::unordered_map<std::string, std::string>>> new_device_packages;
            
            cpu_blacklist.clear();
            cpu_only_packages.clear();
            
            if (config.contains("cpu_spoof")) {
                auto cpu_spoof_config = config["cpu_spoof"];
                
                if (cpu_spoof_config.contains("blacklist")) {
                    for (const auto& pkg : cpu_spoof_config["blacklist"]) {
                        cpu_blacklist.insert(pkg.get<std::string>());
                        LOGD("Loaded blacklisted package: %s", pkg.get<std::string>().c_str());
                    }
                }
                
                if (cpu_spoof_config.contains("cpu_only_packages")) {
                    for (const auto& pkg : cpu_spoof_config["cpu_only_packages"]) {
                        cpu_only_packages.insert(pkg.get<std::string>());
                        LOGD("Loaded CPU only package: %s", pkg.get<std::string>().c_str());
                    }
                }
            }

            for (auto& [key, value] : config.items()) {
                if (key.find("PACKAGES_") == 0 && key.rfind("_DEVICE") != key.size() - 7) {
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

                    std::unordered_map<std::string, std::string> package_settings;
                    
                    if (value.is_array()) {
                        for (const auto& pkg_entry : value) {
                            std::string pkg_str = pkg_entry.get<std::string>();
                            
                            auto [pkg_name, tags] = parsePackageWithTags(pkg_str);
                            std::string setting = getZygiskSettingFromTags(tags);
                            
                            package_settings[pkg_name] = setting;
                            
                            LOGD("Config loaded: %s -> %s", pkg_name.c_str(), setting.c_str());
                        }
                    }
                    
                    new_device_packages.emplace_back(info, package_settings);
                }
            }

            {
                std::lock_guard<std::mutex> lock(info_mutex);
                device_packages = std::move(new_device_packages);
            }

            last_config_mtime = current_mtime;
            LOGD("Config reloaded with %zu devices, %zu cpu_only, %zu blacklist", 
                 device_packages.size(), cpu_only_packages.size(), cpu_blacklist.size());
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
