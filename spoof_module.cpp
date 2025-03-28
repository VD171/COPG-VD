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
#include <GLES2/gl2.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>

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

typedef int (*orig_prop_get_t)(const char*, char*, const char*);
static orig_prop_get_t orig_prop_get = nullptr;
typedef ssize_t (*orig_read_t)(int, void*, size_t);
static orig_read_t orig_read = nullptr;
typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;
typedef const char* (*glGetString_t)(GLenum);
static glGetString_t orig_glGetString = nullptr;
typedef const char* (*eglQueryString_t)(EGLDisplay, EGLint);
static eglQueryString_t orig_eglQueryString = nullptr;
typedef const char* (*adreno_get_gpu_info_t)(void);
static adreno_get_gpu_info_t orig_adreno_get_gpu_info = nullptr;

#ifndef EGL_RENDERER_EXT
#define EGL_RENDERER_EXT 0x305A
#endif

static DeviceInfo current_info;
static std::string current_package_name;
static bool should_spoof_version = false;
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

// Map Android version to SDK_INT
static int getSdkIntForVersion(const std::string& version) {
    if (version == "12") return 31;
    if (version == "13") return 33;
    if (version == "14") return 34;
    return 33; // Default to API 33 (Android 13) if unknown
}

class SpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;

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
        versionClass = (jclass)env->NewGlobalRef(env->FindClass("android/os/Build$VERSION"));
        if (versionClass) {
            versionReleaseField = env->GetStaticFieldID(versionClass, "RELEASE", "Ljava/lang/String;");
            sdkIntField = env->GetStaticFieldID(versionClass, "SDK_INT", "I");
        }

        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            orig_prop_get = (orig_prop_get_t)dlsym(handle, "__system_property_get");
            orig_read = (orig_read_t)dlsym(handle, "read");
            dlclose(handle);
        }

        __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Module loaded");
        hookNativeGetprop();
        hookNativeRead();
        hookJniSetStaticObjectField();
        hookOpenGL();
        hookEGL();
        hookAdrenoUtils();
        loadConfig();
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) {
            __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "No package name in args");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }
        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to get package name");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }
        current_package_name = package_name;
        __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Specializing app: %s", package_name);
        auto it = package_map.find(package_name);
        if (it == package_map.end()) {
            __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "App %s not in package_map", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            should_spoof_version = false;
        } else {
            current_info = it->second;
            should_spoof_version = true;
            applySpoofing(current_info);
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Spoofed %s as %s with Adreno 830", package_name, current_info.model.c_str());
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs* args) override {}

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
            package_map.clear(); // Clear to avoid duplicates
            package_map.reserve(config.size() / 2);
            for (auto& [key, value] : config.items()) {
                if (key.find("_DEVICE") != std::string::npos) continue;
                if (!value.is_array()) {
                    __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Invalid package list for %s: not an array", key.c_str());
                    continue;
                }
                auto packages = value.get<std::vector<std::string>>();
                std::string device_key = key + "_DEVICE";
                if (!config.contains(device_key)) {
                    __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "No device config for %s", key.c_str());
                    continue;
                }
                auto device = config[device_key];

                DeviceInfo info;
                info.brand = device["BRAND"].get<std::string>();
                info.device = device["DEVICE"].get<std::string>();
                info.manufacturer = device["MANUFACTURER"].get<std::string>();
                info.model = device["MODEL"].get<std::string>();
                info.fingerprint = device.contains("FINGERPRINT") ? device["FINGERPRINT"].get<std::string>() : "generic/brand/device:13/RP1A.231005.001/123456:user/release-keys";
                info.build_id = device.contains("BUILD_ID") ? device["BUILD_ID"].get<std::string>() : "";
                info.display = device.contains("DISPLAY") ? device["DISPLAY"].get<std::string>() : "";
                info.product = device.contains("PRODUCT") ? device["PRODUCT"].get<std::string>() : info.device;
                info.version_release = device.contains("VERSION_RELEASE") ? device["VERSION_RELEASE"].get<std::string>() : "13";
                info.serial = device.contains("SERIAL") ? device["SERIAL"].get<std::string>() : "";
                info.cpuinfo = device.contains("CPUINFO") ? device["CPUINFO"].get<std::string>() : "";
                info.serial_content = device.contains("SERIAL_CONTENT") ? device["SERIAL_CONTENT"].get<std::string>() : "";

                for (const auto& pkg : packages) {
                    package_map[pkg] = info;
                    __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "Mapped package %s to device %s (Android %s)", pkg.c_str(), info.model.c_str(), info.version_release.c_str());
                }
            }
        } catch (const json::exception& e) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "JSON parsing failed: %s", e.what());
        }
        file.close();
    }

    void applySpoofing(const DeviceInfo& info) {
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
            env->SetStaticIntField(versionClass, sdkIntField, getSdkIntForVersion(info.version_release));
        if (serialField && !info.serial.empty()) env->SetStaticObjectField(buildClass, serialField, env->NewStringUTF(info.serial.c_str()));

        if (!info.brand.empty()) __system_property_set("ro.product.brand", info.brand.c_str());
        if (!info.device.empty()) __system_property_set("ro.product.device", info.device.c_str());
        if (!info.manufacturer.empty()) __system_property_set("ro.product.manufacturer", info.manufacturer.c_str());
        if (!info.model.empty()) __system_property_set("ro.product.model", info.model.c_str());
        if (!info.fingerprint.empty()) __system_property_set("ro.build.fingerprint", info.fingerprint.c_str());
        __system_property_set("ro.hardware.gpu", "adreno");
        __system_property_set("ro.product.gpu", "Adreno 830");
        if (!info.version_release.empty()) {
            __system_property_set("ro.build.version.release", info.version_release.c_str());
            __system_property_set("ro.build.version.sdk", std::to_string(getSdkIntForVersion(info.version_release)).c_str());
        }
        __system_property_set("ro.opengles.version", "196610");
        __system_property_set("ro.display.refresh_rate", "165");
    }

    static int hooked_prop_get(const char* name, char* value, const char* default_value) {
        if (!orig_prop_get) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_prop_get is null");
            return -1;
        }
        std::string prop_name(name);
        if (prop_name == "ro.product.gpu") {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Property ro.product.gpu requested - Spoofed: Adreno 830");
            strncpy(value, "Adreno 830", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.hardware.gpu") {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Property ro.hardware.gpu requested - Spoofed: adreno");
            strncpy(value, "adreno", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.build.version.release" && should_spoof_version && !current_info.version_release.empty()) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Property ro.build.version.release requested - Spoofed: %s", current_info.version_release.c_str());
            strncpy(value, current_info.version_release.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.build.version.sdk" && should_spoof_version && !current_info.version_release.empty()) {
            std::string api_level = std::to_string(getSdkIntForVersion(current_info.version_release));
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Property ro.build.version.sdk requested - Spoofed: %s", api_level.c_str());
            strncpy(value, api_level.c_str(), PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.opengles.version") {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Property ro.opengles.version requested - Spoofed: 196610");
            strncpy(value, "196610", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.display.refresh_rate") {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Property ro.display.refresh_rate requested - Spoofed: 165");
            strncpy(value, "165", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        }
        return orig_prop_get(name, value, default_value);
    }

    void hookNativeGetprop() {
        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libc.so for prop_get: %s", dlerror());
            return;
        }
        void* sym = dlsym(handle, "__system_property_get");
        if (!sym) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for __system_property_get: %s", dlerror());
            dlclose(handle);
            return;
        }
        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for prop_get: %s", strerror(errno));
            dlclose(handle);
            return;
        }
        *(void**)&orig_prop_get = (void*)hooked_prop_get;
        if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for prop_get: %s", strerror(errno));
        } else {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked __system_property_get");
        }
        dlclose(handle);
    }

    static ssize_t hooked_read(int fd, void* buf, size_t count) {
        if (!orig_read) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_read is null");
            return -1;
        }
        char path[256];
        snprintf(path, sizeof(path), "/proc/self/fd/%d", fd);
        char real_path[256];
        ssize_t len = readlink(path, real_path, sizeof(real_path) - 1);
        if (len != -1) {
            real_path[len] = '\0';
            std::string file_path(real_path);
            if (file_path == "/proc/cpuinfo" && !current_info.cpuinfo.empty()) {
                __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Spoofed /proc/cpuinfo read for %s", current_package_name.c_str());
                size_t bytes_to_copy = std::min(count, current_info.cpuinfo.length());
                memcpy(buf, current_info.cpuinfo.c_str(), bytes_to_copy);
                return bytes_to_copy;
            } else if (file_path == "/sys/devices/soc0/serial_number" && !current_info.serial_content.empty()) {
                __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Spoofed /sys/devices/soc0/serial_number read for %s", current_package_name.c_str());
                size_t bytes_to_copy = std::min(count, current_info.serial_content.length());
                memcpy(buf, current_info.serial_content.c_str(), bytes_to_copy);
                return bytes_to_copy;
            } else if (file_path.find("/sys/class/kgsl/") != std::string::npos && file_path.find("gpu_model") != std::string::npos) {
                const char* spoofed_gpu = "Adreno 830";
                __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Spoofed GPU model read for %s: %s", current_package_name.c_str(), spoofed_gpu);
                size_t bytes_to_copy = std::min(count, strlen(spoofed_gpu));
                memcpy(buf, spoofed_gpu, bytes_to_copy);
                return bytes_to_copy;
            }
        }
        return orig_read(fd, buf, count);
    }

    void hookNativeRead() {
        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libc.so for read: %s", dlerror());
            return;
        }
        void* sym = dlsym(handle, "read");
        if (!sym) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for read: %s", dlerror());
            dlclose(handle);
            return;
        }
        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for read: %s", strerror(errno));
            dlclose(handle);
            return;
        }
        *(void**)&orig_read = (void*)hooked_read;
        if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for read: %s", strerror(errno));
        } else {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked read");
        }
        dlclose(handle);
    }

    static void hooked_set_static_object_field(JNIEnv* env, jclass clazz, jfieldID fieldID, jobject value) {
        if (clazz == buildClass) {
            if (fieldID == modelField || fieldID == brandField || fieldID == deviceField ||
                fieldID == manufacturerField || fieldID == fingerprintField || fieldID == buildIdField ||
                fieldID == displayField || fieldID == productField || fieldID == serialField) {
                __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "Blocked JNI_SetStaticObjectField for Build class field in %s", current_package_name.c_str());
                return;
            }
        } else if (clazz == versionClass && (fieldID == versionReleaseField || fieldID == sdkIntField) && should_spoof_version) {
            __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "Blocked JNI_SetStaticObjectField for VERSION class field in %s", current_package_name.c_str());
            return;
        }
        if (orig_set_static_object_field) {
            orig_set_static_object_field(env, clazz, fieldID, value);
        }
    }

    void hookJniSetStaticObjectField() {
        void* handle = dlopen("libandroid_runtime.so", RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libandroid_runtime.so: %s", dlerror());
            return;
        }
        void* sym = dlsym(handle, "JNI_SetStaticObjectField");
        if (!sym) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for JNI_SetStaticObjectField: %s", dlerror());
            dlclose(handle);
            return;
        }
        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for JNI hook: %s", strerror(errno));
            dlclose(handle);
            return;
        }
        orig_set_static_object_field = *(orig_set_static_object_field_t*)&sym;
        *(void**)&sym = (void*)hooked_set_static_object_field;
        if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for JNI hook: %s", strerror(errno));
        } else {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked JNI_SetStaticObjectField");
        }
        dlclose(handle);
    }

    static const char* hooked_glGetString(GLenum name) {
        if (!orig_glGetString) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_glGetString is null");
            return "Unknown";
        }
        const char* original = orig_glGetString(name);
        if (name == GL_RENDERER) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "GL_RENDERER requested by %s - Spoofed: Adreno 830, Original: %s", current_package_name.c_str(), original);
            return "Adreno 830";
        } else if (name == GL_VERSION) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "GL_VERSION requested by %s - Spoofed: OpenGL ES 3.2, Original: %s", current_package_name.c_str(), original);
            return "OpenGL ES 3.2";
        } else {
            __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "GL Query %d requested by %s - Returning: %s", name, current_package_name.c_str(), original);
        }
        return original;
    }

    void hookOpenGL() {
        const char* libraries[] = {"libGLESv2.so", "libGLESv3.so"};
        for (const char* lib : libraries) {
            void* handle = dlopen(lib, RTLD_LAZY);
            if (!handle) {
                __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open %s: %s", lib, dlerror());
                continue;
            }
            void* sym = dlsym(handle, "glGetString");
            if (!sym) {
                __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for glGetString in %s: %s", lib, dlerror());
                dlclose(handle);
                continue;
            }
            size_t page_size = sysconf(_SC_PAGE_SIZE);
            void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
            if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
                __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for %s: %s", lib, strerror(errno));
                dlclose(handle);
                continue;
            }
            orig_glGetString = *(glGetString_t*)&sym;
            *(void**)&sym = (void*)hooked_glGetString;
            if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
                __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for %s: %s", lib, strerror(errno));
            } else {
                __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked glGetString in %s", lib);
            }
            dlclose(handle);
            break;
        }
    }

    static const char* hooked_eglQueryString(EGLDisplay dpy, EGLint name) {
        if (!orig_eglQueryString) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_eglQueryString is null");
            return "Unknown";
        }
        const char* original = orig_eglQueryString(dpy, name);
        if (name == EGL_RENDERER_EXT) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "EGL_RENDERER_EXT requested by %s - Spoofed: Adreno 830, Original: %s", current_package_name.c_str(), original);
            return "Adreno 830";
        }
        __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "EGL Query %d requested by %s - Returning: %s", name, current_package_name.c_str(), original);
        return original;
    }

    void hookEGL() {
        void* handle = dlopen("libEGL.so", RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libEGL.so: %s", dlerror());
            return;
        }
        void* sym = dlsym(handle, "eglQueryString");
        if (!sym) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for eglQueryString: %s", dlerror());
            dlclose(handle);
            return;
        }
        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for eglQueryString: %s", strerror(errno));
            dlclose(handle);
            return;
        }
        orig_eglQueryString = *(eglQueryString_t*)&sym;
        *(void**)&sym = (void*)hooked_eglQueryString;
        if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for eglQueryString: %s", strerror(errno));
        } else {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked eglQueryString");
        }
        dlclose(handle);
    }

    static const char* hooked_adreno_get_gpu_info() {
        if (!orig_adreno_get_gpu_info) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_adreno_get_gpu_info is null");
            return "Unknown";
        }
        const char* original = orig_adreno_get_gpu_info();
        __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "adreno_get_gpu_info requested by %s - Spoofed: Adreno 830, Original: %s", current_package_name.c_str(), original);
        return "Adreno 830";
    }

    void hookAdrenoUtils() {
        void* handle = dlopen("libadreno_utils.so", RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libadreno_utils.so: %s", dlerror());
            return;
        }
        void* sym = dlsym(handle, "adreno_get_gpu_info");
        if (!sym) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for adreno_get_gpu_info: %s", dlerror());
            dlclose(handle);
            return;
        }
        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for adreno_get_gpu_info: %s", strerror(errno));
            dlclose(handle);
            return;
        }
        orig_adreno_get_gpu_info = *(adreno_get_gpu_info_t*)&sym;
        *(void**)&sym = (void*)hooked_adreno_get_gpu_info;
        if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for adreno_get_gpu_info: %s", strerror(errno));
        } else {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked adreno_get_gpu_info");
        }
        dlclose(handle);
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
