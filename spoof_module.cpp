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
#include <vulkan/vulkan.h>
#include <vector>
#include <cstring>

#define LOG_TAG "GPUSpoof"
#define ALOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define ALOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define ALOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define ALOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)

// EGL extension definitions
#ifndef EGL_RENDERER_EXT
#define EGL_RENDERER_EXT 0x335F
#endif
#ifndef EGL_VENDOR
#define EGL_VENDOR 0x3053
#endif
#ifndef EGL_VERSION
#define EGL_VERSION 0x3054
#endif
#ifndef EGL_EXTENSIONS
#define EGL_EXTENSIONS 0x3055
#endif

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
    std::string vulkan_version;
    std::string vulkan_driver_version;
    std::string gl_extensions;
    std::string egl_extensions;
    std::string dumpsys_gpu_info;
};

// Function pointer types
typedef int (*orig_prop_get_t)(const char*, char*, const char*);
typedef ssize_t (*orig_read_t)(int, void*, size_t);
typedef void (*orig_set_static_object_field_t)(JNIEnv*, jclass, jfieldID, jobject);
typedef const char* (*glGetString_t)(GLenum);
typedef const char* (*eglQueryString_t)(EGLDisplay, EGLint);
typedef const char* (*adreno_get_gpu_info_t)(void);
typedef VkResult (*vkGetPhysicalDeviceProperties_t)(VkPhysicalDevice, VkPhysicalDeviceProperties*);
typedef VkResult (*vkEnumeratePhysicalDevices_t)(VkInstance, uint32_t*, VkPhysicalDevice*);
typedef int (*execve_t)(const char*, char* const*, char* const*);
typedef void* (*SurfaceFlinger_dump_t)(void*, void*, int, char**);
typedef std::string (*GraphicBuffer_dump_t)(const char*);

// Original function pointers
static orig_prop_get_t orig_prop_get = nullptr;
static orig_read_t orig_read = nullptr;
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;
static glGetString_t orig_glGetString = nullptr;
static eglQueryString_t orig_eglQueryString = nullptr;
static adreno_get_gpu_info_t orig_adreno_get_gpu_info = nullptr;
static vkGetPhysicalDeviceProperties_t orig_vkGetPhysicalDeviceProperties = nullptr;
static vkEnumeratePhysicalDevices_t orig_vkEnumeratePhysicalDevices = nullptr;
static execve_t orig_execve = nullptr;
static SurfaceFlinger_dump_t orig_SurfaceFlinger_dump = nullptr;
static GraphicBuffer_dump_t orig_GraphicBuffer_dump = nullptr;

// Global state
static DeviceInfo current_info;
static std::string current_package_name;
static bool should_spoof = false;
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

// Forward declarations of all hooked functions
static int hooked_prop_get(const char* name, char* value, const char* default_value);
static ssize_t hooked_read(int fd, void* buf, size_t count);
static void hooked_set_static_object_field(JNIEnv* env, jclass clazz, jfieldID fieldID, jobject value);
static const char* hooked_glGetString(GLenum name);
static const char* hooked_eglQueryString(EGLDisplay dpy, EGLint name);
static const char* hooked_adreno_get_gpu_info();
static VkResult hooked_vkGetPhysicalDeviceProperties(VkPhysicalDevice physicalDevice, VkPhysicalDeviceProperties* pProperties);
static VkResult hooked_vkEnumeratePhysicalDevices(VkInstance instance, uint32_t* pPhysicalDeviceCount, VkPhysicalDevice* pPhysicalDevices);
static int hooked_execve(const char* pathname, char* const argv[], char* const envp[]);
static void* hooked_SurfaceFlinger_dump(void* thisptr, void* args, int out, char** result);
static std::string hooked_GraphicBuffer_dump(const char* prefix);

// Helper functions
static int getSdkIntForVersion(const std::string& version) {
    if (version == "12") return 31;
    if (version == "13") return 33;
    if (version == "14") return 34;
    return 33;
}

static void hook_function(void* original, void* replacement, const char* name) {
    size_t page_size = sysconf(_SC_PAGE_SIZE);
    void* page_start = (void*)((uintptr_t)original & ~(page_size - 1));
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
        ALOGE("mprotect failed for %s: %s", name, strerror(errno));
        return;
    }

    *(void**)original = replacement;
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
        ALOGE("mprotect restore failed for %s: %s", name, strerror(errno));
    } else {
        ALOGI("Successfully hooked %s", name);
    }
}

// Hook implementations (moved before the GPUSpoofModule class)
static int hooked_prop_get(const char* name, char* value, const char* default_value) {
    if (!orig_prop_get) {
        ALOGE("Original prop_get is null");
        return -1;
    }

    std::string prop_name(name);
    if (prop_name.find("gpu") != std::string::npos || 
        prop_name.find("adreno") != std::string::npos ||
        prop_name.find("egl") != std::string::npos ||
        prop_name.find("gl") != std::string::npos) {
        ALOGI("Intercepted property get: %s", name);
        
        if (prop_name == "ro.product.gpu") {
            strncpy(value, "Adreno 830", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        } else if (prop_name == "ro.hardware.gpu") {
            strncpy(value, "adreno", PROP_VALUE_MAX - 1);
            value[PROP_VALUE_MAX - 1] = '\0';
            return strlen(value);
        }
        // ... rest of the property spoofing cases ...
    }

    return orig_prop_get(name, value, default_value);
}

static ssize_t hooked_read(int fd, void* buf, size_t count) {
    if (!orig_read) {
        ALOGE("Original read is null");
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
            size_t bytes_to_copy = std::min(count, current_info.cpuinfo.length());
            memcpy(buf, current_info.cpuinfo.c_str(), bytes_to_copy);
            return bytes_to_copy;
        }
        // ... rest of the read spoofing cases ...
    }
    return orig_read(fd, buf, count);
}

// Implement all other hooked functions here...

class GPUSpoofModule : public zygisk::ModuleBase {
    // ... rest of the GPUSpoofModule implementation ...
};

// Implement remaining hooked functions after the class definition
static void hooked_set_static_object_field(JNIEnv* env, jclass clazz, jfieldID fieldID, jobject value) {
    // ... implementation ...
}

static const char* hooked_glGetString(GLenum name) {
    // ... implementation ...
}

static const char* hooked_eglQueryString(EGLDisplay dpy, EGLint name) {
    // ... implementation ...
}

static const char* hooked_adreno_get_gpu_info() {
    // ... implementation ...
}

static VkResult hooked_vkGetPhysicalDeviceProperties(VkPhysicalDevice physicalDevice, VkPhysicalDeviceProperties* pProperties) {
    // ... implementation ...
}

static VkResult hooked_vkEnumeratePhysicalDevices(VkInstance instance, uint32_t* pPhysicalDeviceCount, VkPhysicalDevice* pPhysicalDevices) {
    // ... implementation ...
}

static int hooked_execve(const char* pathname, char* const argv[], char* const envp[]) {
    // ... implementation ...
}

static void* hooked_SurfaceFlinger_dump(void* thisptr, void* args, int out, char** result) {
    // ... implementation ...
}

static std::string hooked_GraphicBuffer_dump(const char* prefix) {
    // ... implementation ...
}

REGISTER_ZYGISK_MODULE(GPUSpoofModule)
