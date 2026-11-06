# Native property regression probe

This standalone Android executable tests the process-local mmap property engine without loading the Zygisk module or creating keystore keys. It does not modify COPG configuration, global properties or Google data.

## Build

Use an installed Android NDK and select the toolchain for the build host. This example builds for an arm64 Android device from Linux x86_64:

```sh
export TOOLCHAIN="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
"$TOOLCHAIN/aarch64-linux-android28-clang++" -std=c++17 -O2 -static-libstdc++ \
  -Izygisk tests/prop_virtualizer_probe.cpp zygisk/prop_virtualizer.cpp \
  -o prop-virtualizer-probe
```

## Run

Run in a fresh shell process with access to the device's property areas. Keep the outside-process fingerprint check in the same shell:

```sh
adb push prop-virtualizer-probe /data/local/tmp/prop-virtualizer-probe
adb shell su -c 'before=$(getprop ro.build.fingerprint); /data/local/tmp/prop-virtualizer-probe; rc=$?; after=$(getprop ro.build.fingerprint); [ "$before" = "$after" ] || exit 1; exit "$rc"'
```

Exit 0 means the checks passed. Exit 77 skips devices whose original fingerprint is not stored as a long property. Other nonzero exits indicate a failure. The probe prints no original property values.

The probe checks long-to-short replacement, 10,000 callback reads, length and serial flags, a changed counter, repeated installation, and preservation of board API properties. It separately verifies that `ro.product.first_api_level` follows the configured SDK number.

This is an initialization-time, single-threaded regression test, not a concurrent reader/writer stress test. It does not test JNI fields, legacy Android compatibility, Play Integrity or the hardware attestation path.
