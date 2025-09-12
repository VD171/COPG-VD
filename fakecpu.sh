#!/bin/sh
MODDIR="${0%/*}"
RANDOM_NAME="$RANDOM"
while [ "$(resetprop sys.boot_completed)" != "1" ]; do
    sleep 1
done
cat <<EOF >"/dev/cpuinfo_${RANDOM_NAME}"
Processor	: AArch64 Processor rev 4 (aarch64)
processor	: 0
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x801
CPU revision	: 4

processor	: 1
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x801
CPU revision	: 4

processor	: 2
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x801
CPU revision	: 4

processor	: 3
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x801
CPU revision	: 4

processor	: 4
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x800
CPU revision	: 2

processor	: 5
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x800
CPU revision	: 2

processor	: 6
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x800
CPU revision	: 2

processor	: 7
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0x800
CPU revision	: 2

Hardware : Qualcomm Technologies, Inc SM8750-AB
EOF
chcon u:object_r:system_file:s0 "/dev/cpuinfo_${RANDOM_NAME}"
chmod 444 "/dev/cpuinfo_${RANDOM_NAME}"
chown 0.0 "/dev/cpuinfo_${RANDOM_NAME}"
mount --bind "/dev/cpuinfo_${RANDOM_NAME}" /proc/cpuinfo
