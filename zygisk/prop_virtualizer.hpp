// COPG-VD prop_hook engine (clean-room, Apache-2.0). Per-process property override without any
// function hook: the process's /dev/__properties__ mappings are re-mapped MAP_PRIVATE and the
// inline value of each targeted prop is patched in the private copy, so only this process sees
// the change and no code page is touched (nothing for an inline-hook scanner to find).
#pragma once
#include <map>
#include <string>

namespace copgvd::propvirt {

// values: map of spoofed Build fields (the same "COPG-VD" object the module already parsed).
// Returns false and leaves every mapping untouched on any failure.
bool install(const std::map<std::string, std::string>& values);

}
