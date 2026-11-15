# Tests

Standalone probes for the clean-room property virtualizer (`zygisk/prop_virtualizer.cpp`). They are not built with the module; compile them by hand against an installed NDK and run them from a fresh `adb shell` child on the target device. They do not load the Zygisk module, create keystore keys, or modify the COPG-VD config, global properties or Google data.

```sh
TOOLCHAIN="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
"$TOOLCHAIN/aarch64-linux-android28-clang++" -std=c++17 -O2 -static-libstdc++ \
  -Izygisk tests/prop_virtualizer_cold_probe.cpp zygisk/prop_virtualizer.cpp \
  -o prop-virtualizer-cold-probe
adb push prop-virtualizer-cold-probe /data/local/tmp/
adb shell chmod 755 /data/local/tmp/prop-virtualizer-cold-probe
adb shell /data/local/tmp/prop-virtualizer-cold-probe        # cold: nothing read before install()
adb shell /data/local/tmp/prop-virtualizer-cold-probe prime  # control: fingerprint read first
```

- `prop_virtualizer_probe.cpp` - long-to-short replacement, repeated callback reads, serial metadata, repeat install and board API preservation.
- `prop_virtualizer_cold_probe.cpp` - a cold process (no property read before `install()`) must still see the spoofed fingerprint; it exits non-zero if any value is wrong. The `prime` argument reads the fingerprint first as a control. Each probe prints a one-line JSON result.
