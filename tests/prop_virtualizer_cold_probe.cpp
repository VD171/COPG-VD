// Cold-start regression driver for the Apache-2.0 COPG-VD property virtualizer.
#include "prop_virtualizer.hpp"
#include <sys/system_properties.h>
#include <cstdio>
#include <map>
#include <string>

static std::string callback(const char* name) {
    std::string result;
    const prop_info* property = __system_property_find(name);
    if (property) __system_property_read_callback(property,
        [](void* out, const char*, const char* value, uint32_t) {
            *static_cast<std::string*>(out) = value;
        }, &result);
    return result;
}

int main(int argc, char**) {
    const bool primed = argc > 1;
    if (primed) callback("ro.build.fingerprint");
    const auto sdk = callback("ro.build.version.sdk");
    const auto board = callback("ro.product.board");
    const std::string fingerprint = "copg/lab/lab:14/TEST/1:user/release-keys";
    bool installed = copgvd::propvirt::install({{"FINGERPRINT", fingerprint}, {"MODEL", "copg-lab"},
                                               {"SDK_INT", "99"}, {"BOARD", "copg-board"}});
    char value[PROP_VALUE_MAX] = {};
    __system_property_get("ro.build.fingerprint", value);
    bool get_matches = std::string(value) == fingerprint;
    bool callback_matches = callback("ro.build.fingerprint") == fingerprint;
    bool model_matches = callback("ro.product.model") == "copg-lab";
    bool sdk_unchanged = callback("ro.build.version.sdk") == sdk;
    bool board_unchanged = callback("ro.product.board") == board;
    bool empty_ignored = !copgvd::propvirt::install({{"MODEL", ""}})
                         && callback("ro.product.model") == "copg-lab";
    bool long_ignored = !copgvd::propvirt::install({{"FINGERPRINT", std::string(120, 'x')}})
                        && callback("ro.build.fingerprint") == fingerprint;
    std::printf("{\"fingerprint_primed\":%s,\"installed\":%s,\"property_get_matches\":%s,\"callback_matches\":%s,"
                "\"model_matches\":%s,\"sdk_unchanged\":%s,\"board_unchanged\":%s,"
                "\"empty_override_ignored\":%s,\"long_override_ignored\":%s}\n",
                primed?"true":"false",installed?"true":"false",get_matches?"true":"false",callback_matches?"true":"false",
                model_matches?"true":"false",sdk_unchanged?"true":"false",board_unchanged?"true":"false",
                empty_ignored?"true":"false",long_ignored?"true":"false");
    return installed && get_matches && callback_matches && model_matches && sdk_unchanged && board_unchanged
           && empty_ignored && long_ignored ? 0 : 1;
}
