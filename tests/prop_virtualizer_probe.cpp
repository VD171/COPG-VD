/*
 * ======================================================================
 *  COPG-VD  ::  global device spoofer
 *  Spoof your device fingerprint and build - Zygisk, KernelSU/APatch/Magisk.
 *
 *  Copyright (C) 2026  VD171
 *  SPDX-License-Identifier: Apache-2.0
 *  Fork by VD171.
 *
 *  Licensed under the Apache License, Version 2.0; you may obtain a copy at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/COPG-VD
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
#include "prop_virtualizer.hpp"

#include <sys/system_properties.h>
#include <cstdint>
#include <cstdio>
#include <map>
#include <string>

static std::string readProperty(const char* name) {
    const prop_info* property = __system_property_find(name);
    std::string value;
    if (property) {
        __system_property_read_callback(property,
            [](void* context, const char*, const char* text, uint32_t) {
                *static_cast<std::string*>(context) = text;
            }, &value);
    }
    return value;
}

static int fail(const char* message) {
    std::fprintf(stderr, "FAIL: %s\n", message);
    return 1;
}

int main() {
    const char* name = "ro.build.fingerprint";
    const prop_info* property = __system_property_find(name);
    if (!property) return fail("fingerprint property is unavailable");
    const auto* serial = reinterpret_cast<const uint32_t*>(property);
    const uint32_t before = __atomic_load_n(serial, __ATOMIC_ACQUIRE);
    if (readProperty(name).size() < PROP_VALUE_MAX || !(before & (1U << 16))) {
        std::puts("SKIP: requires an originally long fingerprint property");
        return 77;
    }

    const char* boardNames[] = {
        "ro.board.api_level", "ro.board.first_api_level", "ro.board.current_api_level"
    };
    std::map<std::string, std::string> boardValues;
    for (const char* board : boardNames) boardValues[board] = readProperty(board);

    const std::string replacement = "copg/test/test:16/TEST/1:user/release-keys";
    if (!copgvd::propvirt::install({{"FINGERPRINT", replacement},
                                   {"MODEL", "copg-test"}, {"FIRST_API_LEVEL", "33"}})) {
        return fail("property engine installation failed");
    }
    const uint32_t after = __atomic_load_n(serial, __ATOMIC_ACQUIRE);
    if ((after & 0x10001U) || (after >> 24) != replacement.size()) {
        return fail("incorrect length, long flag or dirty flag");
    }
    if ((before & 0x00fefffeU) == (after & 0x00fefffeU)) {
        return fail("property serial counter did not change");
    }
    for (int i = 0; i < 10000; ++i) {
        if (readProperty(name) != replacement || readProperty("ro.product.model") != "copg-test") {
            return fail("callback returned an incorrect replacement");
        }
    }
    for (const auto& board : boardValues) {
        if (readProperty(board.first.c_str()) != board.second) return fail("board API property changed");
    }
    if (readProperty("ro.product.first_api_level") != "33") return fail("product first API was not replaced");

    if (!copgvd::propvirt::install({{"FINGERPRINT", "short"}})) return fail("repeat installation failed");
    const uint32_t repeated = __atomic_load_n(serial, __ATOMIC_ACQUIRE);
    if (readProperty(name) != "short" || (repeated & 0x10001U) || (repeated >> 24) != 5) {
        return fail("repeat installation left incorrect value or serial metadata");
    }
    std::puts("PASS: long-to-short replacement, 10000 callback reads, serial metadata, repeat install and board API preservation");
    return 0;
}
