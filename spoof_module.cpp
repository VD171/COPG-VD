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
#include <cstdlib>  // For system()
#include <thread>   // For toggle monitoring thread
#include <atomic>   // For thread-safe flags

using json = nlohmann::json;

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
    bool is_game = false;  // Flag for game packages
};

// Static function pointers for hooks (unchanged)
typedef int (*orig_prop_get_t)(const char*, char*, const char*);
static orig_prop_get_t orig_prop_get = nullptr;
typedef ssize_t (*orig_read_t)(int, void*, size_t);
static orig_read_t orig_read = nullptr;
typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;

// Static global variables (unchanged)
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

// Game-specific variables (added)
static std::string current_game;                         // Currently running game
static std::atomic<bool> game_running(false);            // Thread-safe game state
static std::atomic<bool> monitor_running(false);         // Thread-safe monitor control
static bool last_auto_brightness_off = true;             // Last toggle states
static bool last_dnd_on = true;
static bool last_logger_killer = false;
static int pre_game_brightness_mode = -1;                // Pre-game auto-brightness state (0 = manual, 1 = auto)
static bool pre_game_dnd_state = false;                  // Pre-game DND state (0 = off, >0 = on)
static bool pre_game_logd_running = false;               // Pre-game logd state

class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

        // Initialize static fields (unchanged)
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
            }
        }
        if (!versionClass) {
            versionClass = (jclass)env->NewGlobalRef(env->FindClass("android/os/Build$VERSION"));
            if (versionClass) {
                versionReleaseField = env->GetStaticFieldID(versionClass, "RELEASE", "Ljava/lang/String;");
                sdkIntField = env->GetStaticFieldID(versionClass, "SDK_INT", "I");
            }
        }

        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            orig_prop_get = (orig_prop_get_t)dlsym(handle, "__system_property_get");
            orig_read = (orig_read_t)dlsym(handle, "read");
            dlclose(handle);
        }

        hookNativeGetprop();
        hookNativeRead();
        hookJniSetStaticObjectField();
        loadConfig();

        // Start toggle monitoring thread
        monitor_running = true;
        std::thread(monitorToggles, this).detach();
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

        std::string pkg(package_name);
        auto it = package_map.find(pkg);

        // Handle both spoofing and game detection
        if (it != package_map.end()) {
            current_info = it->second;
            if (current_info.is_game) {
                if (!game_running || current_game != pkg) {
                    current_game = pkg;
                    game_running = true;
                    applyGameSettings();
                }
            } else if (game_running && current_game == pkg) {
                // Game process might be ending
                game_running = false;
                revertGameSettings();
                current_game = "";
            } else {
                // Spoofing logic (unchanged)
                spoofDevice(current_info);
                spoofSystemProperties(current_info);
            }
        } else {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        }

        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name || package_map.empty() || !buildClass) return;
        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) return;

        std::string pkg(package_name);
        auto it = package_map.find(pkg);

        // Handle both spoofing and game detection
        if (it != package_map.end()) {
            current_info = it->second;
            if (current_info.is_game) {
                if (!game_running || current_game != pkg) {
                    current_game = pkg;
                    game_running = true;
                    applyGameSettings();
                }
            } else {
                // Spoofing logic (unchanged)
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
        std::ifstream file("/data/adb/modules/COPG/config.json");
        if (!file.is_open()) return;
        try {
            json config = json::parse(file);
            for (auto& [key, value] : config.items()) {
                if (key.find("_DEVICE") != std::string::npos) continue;
                auto packages = value.get<std::vector<std::string>>();
                std::string device_key = key + "_DEVICE";

                DeviceInfo info;
                if (!config.contains(device_key)) {
                    // No DEVICE suffix = game package
                    info.is_game = true;
                } else {
                    // Spoofing package
                    auto device = config[device_key];
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
                }

                for (const auto& pkg : packages) {
                    package_map[pkg] = info;
                }
            }
        } catch (const json::exception&) {}
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

    // Read toggle states from UI
    bool readToggle(const std::string& toggle) {
        std::ifstream state_file("/data/adb/copg_state");
        if (!state_file.is_open()) return true; // Default to enabled if file missing
        std::string line;
        while (std::getline(state_file, line)) {
            if (line.find(toggle + "=") == 0) {
                state_file.close();
                return line.substr(toggle.length() + 1) == "1";
            }
        }
        state_file.close();
        return true; // Default to enabled if toggle not found
    }

    // Get current auto-brightness mode (0 = manual, 1 = auto)
    int getBrightnessMode() {
        FILE* fp = popen("settings get system screen_brightness_mode", "r");
        if (!fp) return -1;
        char buffer[16];
        if (fgets(buffer, sizeof(buffer), fp) != nullptr) {
            pclose(fp);
            return atoi(buffer);
        }
        pclose(fp);
        return -1;
    }

    // Get current DND state (true = on, false = off)
    bool getDndState() {
        FILE* fp = popen("settings get global zen_mode", "r");
        if (!fp) return false;
        char buffer[16];
        if (fgets(buffer, sizeof(buffer), fp) != nullptr) {
            pclose(fp);
            int zen_mode = atoi(buffer);
            return zen_mode > 0; // 0 = off, >0 = on (any DND mode)
        }
        pclose(fp);
        return false;
    }

    // Check if logd is running
    bool isLogdRunning() {
        FILE* fp = popen("pidof logd", "r");
        if (!fp) return false;
        char buffer[16];
        if (fgets(buffer, sizeof(buffer), fp) != nullptr) {
            pclose(fp);
            return true; // PID found, logd is running
        }
        pclose(fp);
        return false; // No PID, logd is not running
    }

    // Apply game optimization settings
    void applyGameSettings() {
        // Capture pre-game states
        pre_game_brightness_mode = getBrightnessMode();
        pre_game_dnd_state = getDndState();
        pre_game_logd_running = isLogdRunning();

        last_auto_brightness_off = readToggle("AUTO_BRIGHTNESS_OFF");
        last_dnd_on = readToggle("DND_ON");
        last_logger_killer = readToggle("LOGGER_KILLER");

        if (last_auto_brightness_off) {
            system("settings put system screen_brightness_mode 0");
        }
        if (last_dnd_on) {
            system("cmd notification set_dnd on");
        }
        if (last_logger_killer && pre_game_logd_running) {
            system("pkill -f logd");
        }
    }

    // Revert game optimization settings to pre-game state
    void revertGameSettings() {
        if (last_auto_brightness_off && pre_game_brightness_mode != -1) {
            std::string cmd = "settings put system screen_brightness_mode " + std::to_string(pre_game_brightness_mode);
            system(cmd.c_str());
        }
        if (last_dnd_on) {
            system(pre_game_dnd_state ? "cmd notification set_dnd on" : "cmd notification set_dnd off");
        }
        if (last_logger_killer && pre_game_logd_running && !isLogdRunning()) {
            system("start logd"); // Restart logd via init if it was running before
        }
    }

    // Monitor toggle changes in a separate thread
    static void monitorToggles(SpoofModule* module) {
        while (monitor_running) {
            if (game_running) {
                bool auto_brightness_off = module->readToggle("AUTO_BRIGHTNESS_OFF");
                bool dnd_on = module->readToggle("DND_ON");
                bool logger_killer = module->readToggle("LOGGER_KILLER");

                // Apply changes if toggles differ from last state
                if (auto_brightness_off != last_auto_brightness_off) {
                    if (auto_brightness_off) {
                        system("settings put system screen_brightness_mode 0");
                    } else {
                        std::string cmd = "settings put system screen_brightness_mode " + std::to_string(module->pre_game_brightness_mode);
                        system(cmd.c_str());
                    }
                    last_auto_brightness_off = auto_brightness_off;
                }
                if (dnd_on != last_dnd_on) {
                    if (dnd_on) {
                        system("cmd notification set_dnd on");
                    } else {
                        system("cmd notification set_dnd off");
                    }
                    last_dnd_on = dnd_on;
                }
                if (logger_killer != last_logger_killer) {
                    if (logger_killer && module->pre_game_logd_running) {
                        system("pkill -f logd");
                    } else if (!logger_killer && module->pre_game_logd_running && !module->isLogdRunning()) {
                        system("start logd"); // Restart logd if it was running before
                    }
                    last_logger_killer = logger_killer;
                }
            }
            sleep(1); // Check every second when game is running
        }
    }

    // Hook functions (unchanged)
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
                }
            }
            dlclose(handle);
        }
    }

    static ssize_t hooked_read(int fd, void* buf, size_t count) {
        if (!orig_read) return -1;

        char path[256];
        ssize_t result = -1;
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
                }
            }
            dlclose(handle);
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
                }
            }
            dlclose(handle);
        }
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
