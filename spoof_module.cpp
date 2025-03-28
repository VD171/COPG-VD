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

// Static function pointers for hooks
typedef int (*orig_prop_get_t)(const char*, char*, const char*);
static orig_prop_get_t orig_prop_get = nullptr;
typedef ssize_t (*orig_read_t)(int, void*, size_t);
static orig_read_t orig_read = nullptr;
typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;
typedef const char* (*glGetString_t)(GLenum);
static glGetString_t orig_glGetString = nullptr; // for OpenGL hook

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

        // Initialize static fields once
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
        } else {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libc.so");
        }

        hookNativeGetprop();
        hookNativeRead();
        hookJniSetStaticObjectField();
        hookOpenGL(); 
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
        auto it = package_map.find(package_name);
        if (it == package_map.end()) {
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            current_info = it->second;
            applySpoofing(current_info); // Consolidated spoofing
            __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "Spoofed %s as %s with Adreno 830", package_name, current_info.model.c_str());
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {
        // Optional: Keep empty unless specific post-actions needed
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;

    void loadConfig() {
        std::ifstream file("/data/adb/modules/COPG/config.json");
        if (!file.is_open()) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open config.json");
            return;
        }
        try {
            json config = json::parse(file);
            package_map.reserve(config.size() / 2); // Optimize memory
            for (auto& [key, value] : config.items()) {
                if (key.find("_DEVICE") != std::string::npos) continue;
                if (!value.is_array()) continue;
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
                    device["FINGERPRINT"].get<std::string>() : "generic/brand/device:14/UP1A.231005.001/123456:user/release-keys";
                info.build_id = device.contains("BUILD_ID") ? device["BUILD_ID"].get<std::string>() : "";
                info.display = device.contains("DISPLAY") ? device["DISPLAY"].get<std::string>() : "";
                info.product = device.contains("PRODUCT") ? device["PRODUCT"].get<std::string>() : info.device;
                info.version_release = device.contains("VERSION_RELEASE") ? 
                    device["VERSION_RELEASE"].get<std::string>() : "";
                info.serial = device.contains("SERIAL") ? device["SERIAL"].get<std::string>() : "";
                info.cpuinfo = device.contains("CPUINFO") ? device["CPUINFO"].get<std::string>() : "";
                info.serial_content = device.contains("SERIAL_CONTENT") ? device["SERIAL_CONTENT"].get<std::string>() : "";

                for (const auto& pkg : packages) package_map[pkg] = info;
            }
        } catch (const json::exception& e) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "JSON parsing failed: %s", e.what());
        }
        file.close();
    }

    void applySpoofing(const DeviceInfo& info) {
        // JNI spoofing
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

        // System property spoofing
        if (!info.brand.empty()) __system_property_set("ro.product.brand", info.brand.c_str());
        if (!info.device.empty()) __system_property_set("ro.product.device", info.device.c_str());
        if (!info.manufacturer.empty()) __system_property_set("ro.product.manufacturer", info.manufacturer.c_str());
        if (!info.model.empty()) __system_property_set("ro.product.model", info.model.c_str());
        if (!info.fingerprint.empty()) __system_property_set("ro.build.fingerprint", info.fingerprint.c_str());

        // GPU spoofing for Adreno 830
        __system_property_set("ro.hardware.gpu", "adreno");
        __system_property_set("ro.product.gpu", "Adreno 830");
        __system_property_set("ro.opengles.version", "196610"); // OpenGL ES 3.2
        __system_property_set("ro.display.refresh_rate", "165"); // Aggressive 165Hz for Snapdragon 8 Elite
    }

    static int hooked_prop_get(const char* name, char* value, const char* default_value) {
        if (!orig_prop_get) return -1;
        std::string prop_name(name);
        if (prop_name == "ro.product.brand" && !current_info.brand.empty()) {
            strncpy(value, current_info.brand.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.product.device" && !current_info.device.empty()) {
            strncpy(value, current_info.device.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.product.manufacturer" && !current_info.manufacturer.empty()) {
            strncpy(value, current_info.manufacturer.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.product.model" && !current_info.model.empty()) {
            strncpy(value, current_info.model.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.build.fingerprint" && !current_info.fingerprint.empty()) {
            strncpy(value, current_info.fingerprint.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.hardware.gpu") {
            strncpy(value, "adreno", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.product.gpu") {
            strncpy(value, "Adreno 830", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.opengles.version") {
            strncpy(value, "196610", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.display.refresh_rate") {
            strncpy(value, "165", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
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
                    __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for prop_get");
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
                } else {
                    __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for read");
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
                } else {
                    __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for JNI hook");
                }
            }
            dlclose(handle);
        }
    }

    static const char* hooked_glGetString(GLenum name) {
        if (!orig_glGetString) return "Unknown";
        if (name == GL_RENDERER) {
            return "Adreno 830"; // Spoof GPU name
        } else if (name == GL_VERSION) {
            return "OpenGL ES 3.2"; // Consistent with Adreno 830
        }
        return orig_glGetString(name);
    }

    void hookOpenGL() {
        void* handle = dlopen("libGLESv2.so", RTLD_LAZY);
        if (handle) {
            void* sym = dlsym(handle, "glGetString");
            if (sym) {
                size_t page_size = sysconf(_SC_PAGE_SIZE);
                void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
                if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == 0) {
                    orig_glGetString = *(glGetString_t*)&sym;
                    *(void**)&sym = (void*)hooked_glGetString;
                    mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
                } else {
                    __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for glGetString");
                }
            } else {
                __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for glGetString");
            }
            dlclose(handle);
        } else {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libGLESv2.so");
        }
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
