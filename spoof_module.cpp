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

#define LOG_TAG "COPGModule"

#define LOGV(...) __android_log_print(ANDROID_LOG_VERBOSE, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define CONFIG_LOG(...) LOGI("[CONFIG] " __VA_ARGS__)
#define SPOOF_LOG(...) LOGI("[SPOOF] " __VA_ARGS__)
#define COMPANION_LOG(...) LOGI("[COMPANION] " __VA_ARGS__)
#define PKG_LOG(...) LOGI("[PKG] " __VA_ARGS__)

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

struct BuildPropValues {
    std::string ro_product_brand;
    std::string ro_product_manufacturer;
    std::string ro_product_model;
    std::string ro_product_device;
    std::string ro_product_name;
    std::string ro_build_fingerprint;
    std::string ro_product_board;
    std::string ro_bootloader;
    std::string ro_hardware;
    std::string ro_build_id;
    std::string ro_build_display_id;
    std::string ro_build_host;

};

static DeviceInfo current_info;
static BuildPropValues original_build_props;
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

static std::string readBuildPropValue(const std::string& prop_name) {
    const char* build_prop_paths[] = {
        "/system/build.prop",
        "/vendor/build.prop",
        nullptr
    };
    
    const char* prefixes[] = {
        "ro.product.",
        "ro.product.system.",
        "ro.product.vendor.",
        ""
    };
    
    for (int i = 0; build_prop_paths[i] != nullptr; i++) {
        FILE* file = fopen(build_prop_paths[i], "r");
        if (!file) continue;
        
        char line[512];
        
        while (fgets(line, sizeof(line), file)) {
            for (int j = 0; j < sizeof(prefixes)/sizeof(prefixes[0]); j++) {
                std::string search_str;
                if (strlen(prefixes[j]) > 0) {
                    search_str = std::string(prefixes[j]) + prop_name + "=";
                } else {
                    search_str = prop_name + "=";
                }
                
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
                    
                    return value;
                }
            }
        }
        
        fclose(file);
    }
    
    return "";
}

static void readOriginalBuildProps() {
    original_build_props.ro_product_brand = readBuildPropValue("brand");
    original_build_props.ro_product_manufacturer = readBuildPropValue("manufacturer");
    original_build_props.ro_product_model = readBuildPropValue("model");
    original_build_props.ro_product_device = readBuildPropValue("device");
    original_build_props.ro_product_name = readBuildPropValue("name");
    original_build_props.ro_build_fingerprint = readBuildPropValue("fingerprint");
    original_build_props.ro_product_board = readBuildPropValue("board");
    original_build_props.ro_bootloader = readBuildPropValue("bootloader");
    original_build_props.ro_hardware = readBuildPropValue("hardware");
    original_build_props.ro_build_id = readBuildPropValue("id");
    original_build_props.ro_build_display_id = readBuildPropValue("display.id");
    original_build_props.ro_build_host = readBuildPropValue("host");
    
    CONFIG_LOG("Original props loaded: brand=%s, model=%s", 
               original_build_props.ro_product_brand.c_str(),
               original_build_props.ro_product_model.c_str());
}

static void companion(int fd) {
    COMPANION_LOG("Started");
    
    auto findResetpropPath = []() -> std::string {
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
    };
    
    char buffer[2048];
    ssize_t bytes = read(fd, buffer, sizeof(buffer)-1);
    
    if (bytes > 0) {
        buffer[bytes] = '\0';
        std::string command = buffer;
        
        int result = -1;
        
        if (command.find("resetprop") == 0) {
            std::string resetprop_path = findResetpropPath();
            if (!resetprop_path.empty()) {
                std::string full_cmd = resetprop_path + " " + command.substr(9);
                COMPANION_LOG("Resetprop cmd: %s", command.substr(9).c_str());
                result = system(full_cmd.c_str());
            }
        }
        
        write(fd, &result, sizeof(result));
    }
    
    close(fd);
}

class COPGModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        LOGI("Module loaded");
        ensureBuildClass();
        reloadIfNeeded(true);
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

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) {
            LOGI("No package name, closing module");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        JniString pkg(env, args->nice_name);
        const char* package_name = pkg.get();
        if (!package_name) {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        PKG_LOG("Processing: %s", package_name);
        reloadIfNeeded(false);

        bool should_close = true;
        bool current_needs_device_spoof = false;
        
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

                    break;
                }
            }

            if (current_needs_device_spoof) {
                spoofDevice(current_info);
                spoofSystemProps(current_info);
                should_close = false;
            }
        }

        if (should_close) {
            LOGI("%s: Not in config, closing", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        }
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        api->setOption(zygisk::DLCLOSE_MODULE_LIBRARY);
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
        
        size_t first_colon = package_name.find(':');
        if (first_colon != std::string::npos && first_colon < package_name.length() - 1) {
            std::string original_name = package_name;
            package_name = original_name.substr(0, first_colon);
            
            size_t start = first_colon + 1;
            while (start < original_name.length()) {
                size_t end = original_name.find(':', start);
                std::string tag;
                if (end == std::string::npos) {
                    tag = original_name.substr(start);
                    start = original_name.length();
                } else {
                    tag = original_name.substr(start, end - start);
                    start = end + 1;
                }
                
                tag.erase(0, tag.find_first_not_of(" \t"));
                tag.erase(tag.find_last_not_of(" \t") + 1);
                
                if (!tag.empty()) {
                    tags.insert(tag);
                }
            }
        }
        
        return {package_name, tags};
    }

    std::string getZygiskSettingFromTags(const std::unordered_set<std::string>& tags) {
        if (tags.find("blocked") != tags.end()) {
            return "blocked";
        } else if (tags.find("with_cpu") != tags.end()) {
            return "with_cpu";
        }
        
        return "";
    }

    bool executeCompanionCommand(const std::string& command) {
        auto fd = api->connectCompanion();
        if (fd < 0) {
            return false;
        }
        
        write(fd, command.c_str(), command.size());
        
        int result = -1;
        read(fd, &result, sizeof(result));
        close(fd);
        
        return result == 0;
    }

    void spoofSystemProps(const DeviceInfo& info) {
        SPOOF_LOG("Starting system props spoofing");
        
        const char* commands[] = {
            "ro.product.brand",
            "ro.product.manufacturer",
            "ro.product.model",
            "ro.product.device",
            "ro.product.name",
            "ro.product.board",
            
            "ro.build.fingerprint",
            "ro.build.id",
            "ro.build.display.id",
            "ro.build.host",
            "ro.build.user",
            
            "ro.bootloader",
            "ro.hardware",
            "ro.board.platform",
            
            "ro.boot.hardware",
            "ro.boot.product.hardware.sku",
            
            "ro.product.build.fingerprint",
            "ro.product.build.id",
            
            "ro.product.odm.brand",
            "ro.product.odm.manufacturer",
            "ro.product.odm.model",
            "ro.product.odm.device",
            "ro.product.odm.name",
            
            "ro.odm.build.fingerprint",
            "ro.odm.build.id",
            
            "ro.product.product.brand",
            "ro.product.product.manufacturer",
            "ro.product.product.model",
            "ro.product.product.device",
            "ro.product.product.name",
            
            "ro.product.system.brand",
            "ro.product.system.manufacturer",
            "ro.product.system.model",
            "ro.product.system.device",
            "ro.product.system.name",
            
            "ro.system.build.fingerprint",
            "ro.system.build.id",
            
            "ro.product.system_ext.brand",
            "ro.product.system_ext.manufacturer",
            "ro.product.system_ext.model",
            "ro.product.system_ext.device",
            "ro.product.system_ext.name",
            
            "ro.system_ext.build.fingerprint",
            "ro.system_ext.build.id",
            
            "ro.product.vendor.brand",
            "ro.product.vendor.manufacturer",
            "ro.product.vendor.model",
            "ro.product.vendor.device",
            "ro.product.vendor.name",
            
            "ro.vendor.build.fingerprint",
            "ro.vendor.build.id",
            
            "ro.product.vendor_dlkm.brand",
            "ro.product.vendor_dlkm.manufacturer",
            "ro.product.vendor_dlkm.model",
            "ro.product.vendor_dlkm.device",
            "ro.product.vendor_dlkm.name",
            
            "ro.vendor_dlkm.build.fingerprint",
            "ro.vendor_dlkm.build.id"
        };
        
        const char* values[] = {
            info.brand.c_str(),
            info.manufacturer.c_str(),
            info.model.c_str(),
            info.device.c_str(),
            info.product.c_str(),
            info.build_board.c_str(),
            
            info.fingerprint.c_str(),
            info.build_id.c_str(),
            info.build_display.c_str(),
            info.build_host.c_str(),
            info.build_user.c_str(),
            
            info.build_bootloader.c_str(),
            info.build_hardware.c_str(),
            info.board_platform.c_str(),
            
            info.boot_hardware.c_str(),
            info.boot_hardware_sku.c_str(),
            
            info.product_build_fingerprint.c_str(),
            info.product_build_id.c_str(),
            
            info.odm_brand.c_str(),
            info.odm_manufacturer.c_str(),
            info.odm_model.c_str(),
            info.odm_device.c_str(),
            info.odm_name.c_str(),
            
            info.odm_build_fingerprint.c_str(),
            info.odm_build_id.c_str(),
            
            info.product_product_brand.c_str(),
            info.product_product_manufacturer.c_str(),
            info.product_product_model.c_str(),
            info.product_product_device.c_str(),
            info.product_product_name.c_str(),
            
            info.product_system_brand.c_str(),
            info.product_system_manufacturer.c_str(),
            info.product_system_model.c_str(),
            info.product_system_device.c_str(),
            info.product_system_name.c_str(),
            
            info.system_build_fingerprint.c_str(),
            info.system_build_id.c_str(),
            
            info.product_system_ext_brand.c_str(),
            info.product_system_ext_manufacturer.c_str(),
            info.product_system_ext_model.c_str(),
            info.product_system_ext_device.c_str(),
            info.product_system_ext_name.c_str(),
            
            info.system_ext_build_fingerprint.c_str(),
            info.system_ext_build_id.c_str(),
            
            info.product_vendor_brand.c_str(),
            info.product_vendor_manufacturer.c_str(),
            info.product_vendor_model.c_str(),
            info.product_vendor_device.c_str(),
            info.product_vendor_name.c_str(),
            
            info.vendor_build_fingerprint.c_str(),
            info.vendor_build_id.c_str(),
            
            info.product_vendor_dlkm_brand.c_str(),
            info.product_vendor_dlkm_manufacturer.c_str(),
            info.product_vendor_dlkm_model.c_str(),
            info.product_vendor_dlkm_device.c_str(),
            info.product_vendor_dlkm_name.c_str(),
            
            info.vendor_dlkm_build_fingerprint.c_str(),
            info.vendor_dlkm_build_id.c_str()
        };
        
        const int num_commands = sizeof(commands) / sizeof(commands[0]);
        
        for (int i = 0; i < num_commands; i++) {
            std::string cmd = std::string("resetprop ") + commands[i] + " \"" + values[i] + "\"";
            if (executeCompanionCommand(cmd)) {
                LOGD("Resetprop successful: %s", cmd.c_str());
            } else {
                LOGW("Resetprop failed: %s", cmd.c_str());
            }
        }
        
        if (info.should_spoof_android_version) {
            const char* release_props[] = {
                "ro.build.version.release",
                "ro.system.build.version.release",
                "ro.vendor.build.version.release",
                "ro.product.build.version.release"
            };
            
            for (const auto& prop : release_props) {
                std::string cmd = std::string("resetprop ") + prop + " \"" + info.android_version + "\"";
                if (executeCompanionCommand(cmd)) {
                    LOGD("Resetprop successful for Android version: %s", cmd.c_str());
                }
            }
        }
        
        if (info.should_spoof_sdk_int) {
            std::string sdk_str = std::to_string(info.sdk_int);
            const char* sdk_props[] = {
                "ro.build.version.sdk",
                "ro.system.build.version.sdk",
                "ro.vendor.build.version.sdk",
                "ro.product.build.version.sdk"
            };
            
            for (const auto& prop : sdk_props) {
                std::string cmd = std::string("resetprop ") + prop + " \"" + sdk_str + "\"";
                if (executeCompanionCommand(cmd)) {
                    LOGD("Resetprop successful for SDK: %s", cmd.c_str());
                }
            }
        }
        
        SPOOF_LOG("System props: model=%s, brand=%s", info.model.c_str(), info.brand.c_str());
    }

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
            std::vector<std::pair<DeviceInfo, std::unordered_map<std::string, std::string>>> new_device_packages;
            
            cpu_blacklist.clear();
            cpu_only_packages.clear();
            
            if (config.contains("cpu_spoof")) {
                auto cpu_spoof_config = config["cpu_spoof"];
                
                if (cpu_spoof_config.contains("blacklist")) {
                    for (const auto& pkg : cpu_spoof_config["blacklist"]) {
                        cpu_blacklist.insert(pkg.get<std::string>());
                    }
                }
                
                if (cpu_spoof_config.contains("cpu_only_packages")) {
                    for (const auto& pkg : cpu_spoof_config["cpu_only_packages"]) {
                        cpu_only_packages.insert(pkg.get<std::string>());
                    }
                }
            }

            int device_count = 0;
            for (auto& [key, value] : config.items()) {
                if (key.find("PACKAGES_") == 0 && key.rfind("_DEVICE") != key.size() - 7) {
                    std::string device_key = key + "_DEVICE";
                    if (!config.contains(device_key) || !config[device_key].is_object()) {
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
                    info.build_board = device.value("BOARD", info.build_board);
                    info.build_bootloader = device.value("BOOTLOADER", "unknown");
                    info.build_hardware = device.value("HARDWARE", info.build_hardware);
                    info.build_id = device.value("ID", info.build_id);
                    info.build_display = device.value("DISPLAY", info.build_display);
                    info.build_host = device.value("HOST", info.build_host);

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

                    std::unordered_map<std::string, std::string> package_settings;
                    
                    if (value.is_array()) {
                        for (const auto& pkg_entry : value) {
                            std::string pkg_str = pkg_entry.get<std::string>();
                            
                            auto [pkg_name, tags] = parsePackageWithTags(pkg_str);
                            std::string setting = getZygiskSettingFromTags(tags);
                            
                            package_settings[pkg_name] = setting;
                        }
                    }
                    
                    new_device_packages.emplace_back(info, package_settings);
                    device_count++;
                }
            }

            {
                std::lock_guard<std::mutex> lock(info_mutex);
                device_packages = std::move(new_device_packages);
            }

            last_config_mtime = current_mtime;
            CONFIG_LOG("Loaded: %d devices, %zu cpu_only, %zu blacklist", 
                      device_count, cpu_only_packages.size(), cpu_blacklist.size());
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
        setStr(build_idField, info.build_id);
        setStr(build_displayField, info.build_display);
        setStr(build_hostField, info.build_host);
        
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
REGISTER_ZYGISK_COMPANION(companion)
