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
typedef const char* (*eglGetString_t)(EGLDisplay, EGLint);
static eglGetString_t orig_eglGetString = nullptr;

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
        __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Module loaded");
        hookNativeGetprop();
        hookNativeRead();
        hookJniSetStaticObjectField();
        hookOpenGL();
        hookEGL();
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
        __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Specializing app: %s", package_name);
        auto it = package_map.find(package_name);
        if (it == package_map.end()) {
            __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "App %s not in package_map", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
        } else {
            current_info = it->second;
            applySpoofing(current_info);
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Spoofed %s as %s with Adreno 830", package_name, current_info.model.c_str());
        }
        env->ReleaseStringUTFChars(args->nice_name, package_name);
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
                info.fingerprint = device.contains("FINGERPRINT") ? device["FINGERPRINT"].get<std::string>() : "";
                info.build_id = device.contains("BUILD_ID") ? device["BUILD_ID"].get<std::string>() : "";
                info.display = device.contains("DISPLAY") ? device["DISPLAY"].get<std::string>() : "";
                info.product = device.contains("PRODUCT") ? device["PRODUCT"].get<std::string>() : info.device;
                info.version_release = device.contains("VERSION_RELEASE") ? device["VERSION_RELEASE"].get<std::string>() : "";
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

        if (!info.brand.empty()) __system_property_set("ro.product.brand", info.brand.c_str());
        if (!info.device.empty()) __system_property_set("ro.product.device", info.device.c_str());
        if (!info.manufacturer.empty()) __system_property_set("ro.product.manufacturer", info.manufacturer.c_str());
        if (!info.model.empty()) __system_property_set("ro.product.model", info.model.c_str());
        if (!info.fingerprint.empty()) __system_property_set("ro.build.fingerprint", info.fingerprint.c_str());
        __system_property_set("ro.hardware.gpu", "adreno");
        __system_property_set("ro.product.gpu", "Adreno 830");
        __system_property_set("ro.opengles.version", "196610");
        __system_property_set("ro.display.refresh_rate", "165");
    }

    static int hooked_prop_get(const char* name, char* value, const char* default_value) {
        if (!orig_prop_get) return -1;
        std::string prop_name(name);
        if (prop_name == "ro.product.gpu") {
            strncpy(value, "Adreno 830", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.hardware.gpu") {
            strncpy(value, "adreno", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.opengles.version") {
            strncpy(value, "196610", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        }
        return orig_prop_get(name, value, default_value);
    }

    void hookNativeGetprop() {
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
            } else if (file_path.find("/sys/class/kgsl/") != std::string::npos && file_path.find("gpu_model") != std::string::npos) {
                const char* spoofed_gpu = "Adreno 830";
                size_t bytes_to_copy = std::min(count, strlen(spoofed_gpu));
                memcpy(buf, spoofed_gpu, bytes_to_copy);
                __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Spoofed GPU model read: %s", spoofed_gpu);
                return bytes_to_copy;
            }
        }
        return orig_read(fd, buf, count);
    }

    void hookNativeRead() {
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
        if (clazz == buildClass && (fieldID == modelField || fieldID == brandField || fieldID == deviceField ||
            fieldID == manufacturerField || fieldID == fingerprintField || fieldID == buildIdField ||
            fieldID == displayField || fieldID == productField || fieldID == serialField)) {
            return;
        } else if (clazz == versionClass && fieldID == versionReleaseField) {
            return;
        }
        if (orig_set_static_object_field) orig_set_static_object_field(env, clazz, fieldID, value);
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

    static const char* hooked_glGetString(GLenum name) {
        if (!orig_glGetString) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_glGetString is null");
            return "Unknown";
        }
        const char* original = orig_glGetString(name);
        if (name == GL_RENDERER) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "GL_RENDERER requested - Spoofed: Adreno 830, Original: %s", original);
            return "Adreno 830";
        } else if (name == GL_VERSION) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "GL_VERSION requested - Spoofed: OpenGL ES 3.2, Original: %s", original);
            return "OpenGL ES 3.2";
        }
        __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "GL Query %d requested - Returning: %s", name, original);
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

    static const char* hooked_eglGetString(EGLDisplay dpy, EGLint name) {
        if (!orig_eglGetString) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "orig_eglGetString is null");
            return "Unknown";
        }
        const char* original = orig_eglGetString(dpy, name);
        if (name == EGL_RENDERER_EXT) {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "EGL_RENDERER_EXT requested - Spoofed: Adreno 830, Original: %s", original);
            return "Adreno 830";
        }
        __android_log_print(ANDROID_LOG_DEBUG, "SpoofModule", "EGL Query %d requested - Returning: %s", name, original);
        return original;
    }

    void hookEGL() {
        void* handle = dlopen("libEGL.so", RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "Failed to open libEGL.so: %s", dlerror());
            return;
        }
        void* sym = dlsym(handle, "eglGetString");
        if (!sym) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "dlsym failed for eglGetString: %s", dlerror());
            dlclose(handle);
            return;
        }
        size_t page_size = sysconf(_SC_PAGE_SIZE);
        void* page_start = (void*)((uintptr_t)sym & ~(page_size - 1));
        if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect failed for eglGetString: %s", strerror(errno));
            dlclose(handle);
            return;
        }
        orig_eglGetString = *(eglGetString_t*)&sym;
        *(void**)&sym = (void*)hooked_eglGetString;
        if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
            __android_log_print(ANDROID_LOG_ERROR, "SpoofModule", "mprotect restore failed for eglGetString: %s", strerror(errno));
        } else {
            __android_log_print(ANDROID_LOG_INFO, "SpoofModule", "Successfully hooked eglGetString");
        }
        dlclose(handle);
    }
};

REGISTER_ZYGISK_MODULE(SpoofModule)
