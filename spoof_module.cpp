// main.cpp
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

#define LOG_TAG "GPUSpoof"
#define ALOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define ALOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

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

// Original function pointers
static orig_prop_get_t orig_prop_get = nullptr;
static orig_read_t orig_read = nullptr;
static orig_set_static_object_field_t orig_set_static_object_field = nullptr;
static glGetString_t orig_glGetString = nullptr;
static eglQueryString_t orig_eglQueryString = nullptr;
static adreno_get_gpu_info_t orig_adreno_get_gpu_info = nullptr;
static vkGetPhysicalDeviceProperties_t orig_vkGetPhysicalDeviceProperties = nullptr;
static vkEnumeratePhysicalDevices_t orig_vkEnumeratePhysicalDevices = nullptr;

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

// Helper functions
static int getSdkIntForVersion(const std::string& version) {
    if (version == "12") return 31;
    if (version == "13") return 33;
    if (version == "14") return 34;
    return 33;
}

static void hook_function(void* original, void* replacement, const char* name) {
    void* handle = dlopen("libc.so", RTLD_LAZY);
    if (!handle) {
        ALOGE("Failed to open libc.so for %s: %s", name, dlerror());
        return;
    }

    size_t page_size = sysconf(_SC_PAGE_SIZE);
    void* page_start = (void*)((uintptr_t)original & ~(page_size - 1));
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) != 0) {
        ALOGE("mprotect failed for %s: %s", name, strerror(errno));
        dlclose(handle);
        return;
    }

    *(void**)original = replacement;
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_EXEC) != 0) {
        ALOGE("mprotect restore failed for %s: %s", name, strerror(errno));
    } else {
        ALOGI("Successfully hooked %s", name);
    }
    
    dlclose(handle);
}

class GPUSpoofModule : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        this->api = api;
        this->env = env;
        initJNIFields(env);
        loadConfig();
        setupHooks();
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        if (!args || !args->nice_name) {
            ALOGE("No package name in args");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        const char* package_name = env->GetStringUTFChars(args->nice_name, nullptr);
        if (!package_name) {
            ALOGE("Failed to get package name");
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            return;
        }

        current_package_name = package_name;
        ALOGI("Processing app: %s", package_name);

        auto it = package_map.find(package_name);
        if (it == package_map.end()) {
            ALOGI("App %s not in target list", package_name);
            api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
            should_spoof = false;
        } else {
            current_info = it->second;
            should_spoof = true;
            applySpoofing();
            ALOGI("Spoofing %s as %s with Adreno 830", package_name, current_info.model.c_str());
        }
        
        env->ReleaseStringUTFChars(args->nice_name, package_name);
    }

private:
    zygisk::Api* api;
    JNIEnv* env;
    std::unordered_map<std::string, DeviceInfo> package_map;

    void initJNIFields(JNIEnv* env) {
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
    }

    void loadConfig() {
        std::ifstream file("/data/adb/modules/gpuspoof/config.json");
        if (!file.is_open()) {
            ALOGE("Failed to open config.json");
            return;
        }

        try {
            json config = json::parse(file);
            for (auto& [key, value] : config.items()) {
                if (key.find("_DEVICE") != std::string::npos) continue;
                
                if (!value.is_array()) {
                    ALOGE("Invalid package list for %s", key.c_str());
                    continue;
                }

                std::string device_key = key + "_DEVICE";
                if (!config.contains(device_key)) {
                    ALOGE("No device config for %s", key.c_str());
                    continue;
                }

                auto device = config[device_key];
                DeviceInfo info;
                info.brand = device["BRAND"].get<std::string>();
                info.device = device["DEVICE"].get<std::string>();
                info.manufacturer = device["MANUFACTURER"].get<std::string>();
                info.model = device["MODEL"].get<std::string>();
                info.fingerprint = device.value("FINGERPRINT", "generic/brand/device:13/RP1A.231005.001/123456:user/release-keys");
                info.build_id = device.value("BUILD_ID", "");
                info.display = device.value("DISPLAY", "");
                info.product = device.value("PRODUCT", info.device);
                info.version_release = device.value("VERSION_RELEASE", "13");
                info.serial = device.value("SERIAL", "");
                info.cpuinfo = device.value("CPUINFO", "");
                info.serial_content = device.value("SERIAL_CONTENT", "");
                info.vulkan_version = device.value("VULKAN_VERSION", "1.3.0");
                info.vulkan_driver_version = device.value("VULKAN_DRIVER_VERSION", "1.3.0");

                for (const auto& pkg : value.get<std::vector<std::string>>()) {
                    package_map[pkg] = info;
                    ALOGI("Mapped package %s to device %s", pkg.c_str(), info.model.c_str());
                }
            }
        } catch (const json::exception& e) {
            ALOGE("JSON parsing failed: %s", e.what());
        }
        
        file.close();
    }

    void setupHooks() {
        // System property hooks
        void* handle = dlopen("libc.so", RTLD_LAZY);
        if (handle) {
            orig_prop_get = (orig_prop_get_t)dlsym(handle, "__system_property_get");
            orig_read = (orig_read_t)dlsym(handle, "read");
            dlclose(handle);
        }

        hookNativeGetprop();
        hookNativeRead();
        hookJniSetStaticObjectField();
        hookOpenGL();
        hookEGL();
        hookAdrenoUtils();
        hookVulkan();
    }

    void applySpoofing() {
        // Set Java fields
        if (modelField) env->SetStaticObjectField(buildClass, modelField, env->NewStringUTF(current_info.model.c_str()));
        if (brandField) env->SetStaticObjectField(buildClass, brandField, env->NewStringUTF(current_info.brand.c_str()));
        if (deviceField) env->SetStaticObjectField(buildClass, deviceField, env->NewStringUTF(current_info.device.c_str()));
        if (manufacturerField) env->SetStaticObjectField(buildClass, manufacturerField, env->NewStringUTF(current_info.manufacturer.c_str()));
        if (fingerprintField) env->SetStaticObjectField(buildClass, fingerprintField, env->NewStringUTF(current_info.fingerprint.c_str()));
        if (buildIdField && !current_info.build_id.empty()) env->SetStaticObjectField(buildClass, buildIdField, env->NewStringUTF(current_info.build_id.c_str()));
        if (displayField && !current_info.display.empty()) env->SetStaticObjectField(buildClass, displayField, env->NewStringUTF(current_info.display.c_str()));
        if (productField && !current_info.product.empty()) env->SetStaticObjectField(buildClass, productField, env->NewStringUTF(current_info.product.c_str()));
        if (versionReleaseField && !current_info.version_release.empty()) 
            env->SetStaticObjectField(versionClass, versionReleaseField, env->NewStringUTF(current_info.version_release.c_str()));
        if (sdkIntField && !current_info.version_release.empty()) 
            env->SetStaticIntField(versionClass, sdkIntField, getSdkIntForVersion(current_info.version_release));
        if (serialField && !current_info.serial.empty()) env->SetStaticObjectField(buildClass, serialField, env->NewStringUTF(current_info.serial.c_str()));

        // Set system properties
        if (!current_info.brand.empty()) __system_property_set("ro.product.brand", current_info.brand.c_str());
        if (!current_info.device.empty()) __system_property_set("ro.product.device", current_info.device.c_str());
        if (!current_info.manufacturer.empty()) __system_property_set("ro.product.manufacturer", current_info.manufacturer.c_str());
        if (!current_info.model.empty()) __system_property_set("ro.product.model", current_info.model.c_str());
        if (!current_info.fingerprint.empty()) __system_property_set("ro.build.fingerprint", current_info.fingerprint.c_str());
        __system_property_set("ro.hardware.gpu", "adreno");
        __system_property_set("ro.product.gpu", "Adreno 830");
        __system_property_set("ro.board.platform", "kona");
        __system_property_set("ro.chipname", "SM8250");
        __system_property_set("ro.hardware.chipname", "kona");
        if (!current_info.version_release.empty()) {
            __system_property_set("ro.build.version.release", current_info.version_release.c_str());
            __system_property_set("ro.build.version.sdk", std::to_string(getSdkIntForVersion(current_info.version_release)).c_str());
        }
        __system_property_set("ro.opengles.version", "196610");
        __system_property_set("ro.display.refresh_rate", "165");
    }

    // Hook implementations...
    // [Previous hook implementations go here, but updated with new Vulkan hooks]
    
    void hookVulkan() {
        void* handle = dlopen("libvulkan.so", RTLD_LAZY);
        if (!handle) {
            ALOGE("Failed to load libvulkan.so");
            return;
        }

        orig_vkGetPhysicalDeviceProperties = (vkGetPhysicalDeviceProperties_t)dlsym(handle, "vkGetPhysicalDeviceProperties");
        if (orig_vkGetPhysicalDeviceProperties) {
            hook_function((void*)orig_vkGetPhysicalDeviceProperties, (void*)hooked_vkGetPhysicalDeviceProperties, "vkGetPhysicalDeviceProperties");
        }

        orig_vkEnumeratePhysicalDevices = (vkEnumeratePhysicalDevices_t)dlsym(handle, "vkEnumeratePhysicalDevices");
        if (orig_vkEnumeratePhysicalDevices) {
            hook_function((void*)orig_vkEnumeratePhysicalDevices, (void*)hooked_vkEnumeratePhysicalDevices, "vkEnumeratePhysicalDevices");
        }

        dlclose(handle);
    }

    static VkResult hooked_vkGetPhysicalDeviceProperties(VkPhysicalDevice physicalDevice, VkPhysicalDeviceProperties* pProperties) {
        VkResult result = orig_vkGetPhysicalDeviceProperties(physicalDevice, pProperties);
        if (result == VK_SUCCESS && should_spoof) {
            strncpy(pProperties->deviceName, "Adreno 830", VK_MAX_PHYSICAL_DEVICE_NAME_SIZE);
            pProperties->vendorID = 0x13F0; // Qualcomm
            pProperties->deviceID = 0x0830; // Fake Adreno 830
            pProperties->apiVersion = VK_MAKE_VERSION(1, 3, 0);
            pProperties->driverVersion = VK_MAKE_VERSION(512, 512, 0);
            ALOGI("Spoofed Vulkan device properties for %s", current_package_name.c_str());
        }
        return result;
    }

    static VkResult hooked_vkEnumeratePhysicalDevices(VkInstance instance, uint32_t* pPhysicalDeviceCount, VkPhysicalDevice* pPhysicalDevices) {
        VkResult result = orig_vkEnumeratePhysicalDevices(instance, pPhysicalDeviceCount, pPhysicalDevices);
        if (result == VK_SUCCESS && should_spoof && pPhysicalDeviceCount) {
            ALOGI("Intercepted vkEnumeratePhysicalDevices for %s", current_package_name.c_str());
        }
        return result;
    }
};

REGISTER_ZYGISK_MODULE(GPUSpoofModule)
