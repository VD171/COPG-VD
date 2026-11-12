<!--
  COPG-VD - global device spoofer: spoof your device fingerprint and build.
  Copyright (C) 2026  AlirezaParsi & VD171 - SPDX-License-Identifier: Apache-2.0 (Fork by VD171)
-->

# COPG-VD

<p align="center">
  <img src="images/logo-wordmark.png" alt="COPG-VD" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/COPG-VD?label=release&color=2ee89d" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/COPG-VD/releases"><img src="https://img.shields.io/github/downloads/VD171/COPG-VD/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/COPG-VD/stargazers"><img src="https://img.shields.io/github/stars/VD171/COPG-VD?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>COPG-VD는 기기 스푸퍼입니다: 기기의 fingerprint와 build를 다시 작성하여, 앱이 실제 기기 대신 당신이 선택한 기기를 보도록 합니다.</b><br>
  Zygisk (KernelSU, APatch 또는 Magisk) 위에서 동작하며, 기본적으로 스푸프의 범위를 Google Play 스택으로 한정합니다 - PlayIntegrityFix보다 가볍고 더 견고한 대안입니다.
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases">Releases</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki">Wiki</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/USER-GUIDE">User guide</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/CONFIGURATION">Configuration</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/ARCHITECTURE">Architecture</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/FILE-STRUCTURE">File structure</a> ·
  <a href="https://xdaforums.com/t/COPG-VD.4807698/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

---

## 사용 방법
모듈을 설치하고 재부팅하면, 동봉된 프로필(Pixel)이 대상 앱에 대해 스푸핑됩니다. 작동하는 fingerprint가 있으면 PlayIntegrityFix나 GooglePhotosUnlimited가 필요 없습니다.  
모든 설정은 `/data/adb/COPG-VD/COPG-VD.json`에서, 또는 WebUI에서 구성합니다. 모든 필드는 선택 사항입니다 - 제공되지 않은 필드는 건너뜁니다.  

### Scope - 누가 스푸프를 보는가
`scope_mode`는 어떤 프로세스가 스푸핑된 식별 정보를 받을지 결정합니다. 범위가 지정된 모드에서는 식별 정보가 Zygisk에 의해 프로세스별로 전달되며, 전역 속성을 통해 시스템의 나머지 부분으로 유출되지 않습니다.  
* **Google Play** (`playstore`, 기본값) - Play 스택만 (Google Play services, 그 unstable 프로세스, 그리고 Play Store).  
* **Global** - 기기 전체; 모든 프로세스가 봅니다.  
* **Whitelist** - `scope_whitelist`에 있는 앱만.  
* **Blacklist** - `scope_blacklist`에 있는 것을 제외한 모든 앱.  

### Engine - 스푸프가 어떻게 전달되는가
각각은 독립적이며 끌 수 있습니다:  
* **Build fields (JNI)** - 대상 프로세스에서 `android.os.Build.*`를 다시 작성합니다.  
* **Property hook** - 스푸핑된 시스템 속성을 대상 프로세스에 제시합니다 (함수 후킹 없이, 속성 영역을 프로세스별로 clean-room 재매핑합니다).  
* **resetprop** - 시스템 속성을 다시 작성하며, 그룹별로 관리됩니다: 식별 정보, 버전, 부팅 상태, SELinux, adb/usb, 안티 에뮬레이터, 그리고 정리 패스. 범위가 지정된 모드에서는 식별 정보와 버전 그룹이 기기 전체 resetprop에서 제외됩니다 (Zygisk가 프로세스별로 전달합니다). boot/lock/SELinux 그룹은 전역으로 유지됩니다.  
* **DRM / Widevine** (기본적으로 꺼짐) - 선택한 Widevine 보안 레벨(L1 또는 L3)을 그것을 읽는 앱에 보고합니다. 기본적으로 위의 범위를 따릅니다. `drm_targets`(앱 목록)를 설정하면 `scope_mode`와 무관하게 **오직** 해당 앱에만 DRM 스푸핑을 적용합니다 - 해당 앱이 주 범위 밖에 있어도 모듈은 DRM 후크만을 위해 나열된 앱에 로드된 상태로 유지됩니다. 비어 있거나 없으면 범위를 따릅니다. (범위 모드가 필요하며 Global이 아닙니다.)  

### 필드 - 설정, 비움, 삭제 또는 건너뛰기
`COPG-VD` 객체 안에서 각 Build 필드는 네 가지 상태를 가집니다:  
* **Set** - `"KEY": "value"`는 값을 씁니다.  
* **Empty** - `"KEY": ""`는 빈 값을 씁니다.  
* **Delete** - 키를 제거하려면 최상위 `"COPG-VD-Delete": [ ... ]`에 해당 키를 나열합니다 (Build 필드는 null이 되고, 속성은 `resetprop --delete`로 제거됩니다).  
* **Skip** - 키를 완전히 생략합니다; ROM 자체의 값이 유지됩니다.  

`"global_fields": [ ... ]` 목록은 범위가 지정된 모드에서도 지정된 Build 필드를 기기 전체에 적용하여 값을 어디서나 일관되게 유지합니다 - 일관성 측면에서 안전한 필드(예: security patch)에만 해당하며, 식별 정보는 절대 안 되고 Android 버전 그룹도 절대 안 됩니다.  

### JSON 설정 파일 예시
`/data/adb/COPG-VD/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.261016.008-factory-28d56d15.zip",
  "scope_mode": "playstore",
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": [],
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.261016.008",
    "ID": "ZP11.261016.008",
    "HOST": "e4df75f83a59",
    "INCREMENTAL": "16754936",
    "TIMESTAMP": "1793211232",
    "PREVIEW_SDK": "20261104",
    "USER": "android-build",
    "SDK_FINGERPRINT": "ee82a872870173d77e68050e21a2bcbf",
    "UUID": "FjWvtSORkI0sEwekaPz2s30gqV5vWP_EZHFtBiXzboc",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  }
}
```
문자열은 반드시 큰따옴표만 사용하세요.  
위 블록과 `module/COPG-VD.json.example`은 [Update COPG-VD.json](.github/workflows/update-json.yml) workflow에 의해 매일 갱신되며, Google의 최신 공장 이미지에서 바로 가져옵니다.  

### fingerprint를 최신으로 유지하기
`fingerprint-update.sh`는 그 파일을 받아서 설정을 갱신합니다. WebUI(**Check Update** / **Update Now**)를 통하거나, **부팅당 한 번씩**(**Auto-update JSON on boot**, 기본적으로 켜짐) 스스로 수행합니다.  
* `/data/adb/COPG-VD/COPG-VD.json`은 제자리에서 갱신되며, 이전 내용은 그 옆에 `COPG-VD.json.bak`으로 보관됩니다.  
* build 필드(fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user)만 다시 작성됩니다. 사용자가 직접 설정한 나머지는 모두 보존됩니다: 추가 키, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, 다른 객체, 키 순서와 서식.  
* 절대 뒤로 가지 않습니다: 설치된 것보다 오래된 upstream build는 거부됩니다. 이는
  일상적인 일이며(저장소가 사용자가 손으로 갱신한 설정보다 뒤처질 수 있음), Android에서
  가장 중요한 보호 장치이기도 합니다. Android에서 사용 가능한 유일한 다운로더는 busybox `wget`이며, 이는
  TLS 인증서를 검증할 수 없기 때문입니다 - 같은 이유로 모든 값은 사용 전에 검증됩니다.  
* 사용자의 프로필이 **다른 기기**(`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`가 다름)를 스푸핑하는 경우, 아무것도 적용되지 않습니다 - 다른 프로필에 Pixel fingerprint를 쓰는 것은 오래된 fingerprint보다 더 나쁩니다.  
* 부팅 시에는 백그라운드에서 실행되며 약 10분 동안 계속 재시도합니다. 부팅이 끝날 때 보통 wifi가 아직 올라오지 않았기 때문입니다. 부팅을 절대 지연시키지 않습니다.  
* `resetprop`은 갱신 직후 다시 적용되지만, `android.os.Build`는 zygote가 시작될 때 zygisk 모듈이 작성합니다: 새 값이 앱에 도달하려면 **재부팅**하세요.  
* 로그는 `/data/adb/COPG-VD/update.log`에 있습니다.  

### Android 버전 - 그리고 이것이 스푸핑되지 않는 이유
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL`, `CODENAME`은 스푸핑되는 기기가 아니라 **사용자의 ROM**을 설명합니다. 앱에게 SDK가 framework의 실제보다 더 최신이라고 알리면, 존재하지 않는 API를 호출하게 됩니다: Google 앱이 충돌하고, 폰이 재부팅되며, 처음부터 다시 시작됩니다. 부팅 자체는 완료되므로 이것은 **softloop**이며 부팅 로그에는 아무것도 나타나지 않습니다.  
* 이들은 배포된 설정에 포함되지 않으며 업데이터는 절대 작성하지 않습니다.  
* WebUI의 **Spoof Android version**이 이들을 적용할지 여부를 결정합니다:  
  * **Never**(기본값) - ROM 자체의 버전이 사용됩니다.  
  * **Up to this ROM** - 그것을 초과하지 않는 것만 적용되며, 실제로는 SDK를 낮추는 것을 의미합니다.  
  * **Force** - 설정에 적힌 그대로입니다. 이것이 softloop를 유발합니다.  
* 실제 버전은 `/system/build.prop`에서 읽으며, 절대 `getprop`에서 읽지 않습니다 - 그것이야말로 이 모듈이 조작하는 대상입니다.  

### Analyze
WebUI의 **Analyze**(또는 `fingerprint-update.sh analyze`)는 현재 상태의 설정을 감사합니다: ROM 대비 버전, 파일이 여전히 파싱되는지(깨진 파일은 모듈이 **아무것도** 스푸핑하지 못하게 하며, logcat만 알려줍니다), fingerprint가 주변 필드와 일치하는지, 모듈이 읽지 않는 키, 날짜, 그리고 props가 이미 설정이 요구하는 것을 담고 있는지.  

### WebUI
WebUI는 선택 사항입니다 - 모든 것은 JSON 설정에서 직접 편집할 수 있습니다 - 하지만 모듈을 다루는 쉬운 방법입니다. 다섯 개의 탭이 있습니다: **About**, **Device**(모든 필드를 상태별로 설정하고 카테고리별로 그룹화), **Spoofing**(범위와 엔진), **System**(resetprop 그룹), 그리고 **Tools**(Analyze, Check Update, Update Now, Backup/Restore, 그리고 부팅 시 자동 업데이트). 네트워크 요청을 전혀 하지 않습니다; 필요한 모든 것이 모듈 안에 포함되어 있습니다.  
Magisk 사용자라면 KOW의 KsuWebUI를 사용하세요(https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### 설정 안의 설정
`COPG-VD.json`은 설정을 프로필 옆에 담으므로, 사용자의 선택이 백업과 함께 이동하고 손으로 편집할 수 있습니다: `scope_mode`, 엔진 스위치, resetprop 그룹, `global_fields`, 그리고 `COPG-VD-Settings` 객체(`resetprop`, `autoupdate`, `spoof_version`). 모든 것은 이 하나의 파일에 담겨 있습니다 - 부팅 스크립트와 WebUI는 설정을 거기에서 바로 읽으므로, 사용자의 선택은 모듈 업데이트 후에도 유지됩니다. `"spoof_version": "force"`는 파일에서 읽을 때 거부되고 강등됩니다: 오래된 백업을 복원하는 것이 몰래 그것을 다시 작동시켜서는 안 됩니다.  

<!-- vd-docs -->
## 문서

- **[Wiki](https://github.com/VD171/COPG-VD/wiki/ko-Home)**: 온라인으로 볼 수 있는 전체 문서.
- **[사용자 가이드](https://github.com/VD171/COPG-VD/wiki/ko-USER-GUIDE)**: 설치, WebUI, 그리고 일상적인 사용법.
- **[설정 레퍼런스](https://github.com/VD171/COPG-VD/wiki/ko-CONFIGURATION)**: 설정 파일의 모든 항목과 그 역할.
- **[아키텍처](https://github.com/VD171/COPG-VD/wiki/ko-ARCHITECTURE)** 및 **[파일 구조](https://github.com/VD171/COPG-VD/wiki/ko-FILE-STRUCTURE)**: 스푸핑 작동 방식과 모든 파일의 위치.

<!-- /vd-docs -->

## 관련 앱

같은 작성자의 자매 프로젝트:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: 각 항목을 그것을 읽을 수 있는 모든 메서드를 통해 읽고 나란히 비교하는 기기 메서드 디버거입니다.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: 당신의 Google 서비스(RCS, Wallet, Play Integrity 증명)를 인터넷 없이 기기에서 읽습니다.
- **[VDBackup](https://github.com/VD171/VD-Backup)**: 앱과 데이터의 전체 백업과 복원을 root로 수행하며, 전적으로 WebUI에서 제어합니다.

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork of @T3SL4).

## 연락처

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
* **GitHub:** @VD171 https://github.com/VD171

## 라이선스

**Apache-2.0** - [LICENSE](LICENSE)를 참조하세요. COPG-VD는 AlirezaParsi의 원본 COPG를 VD171이 포크한 것으로, 동일한 라이선스로 계속됩니다.

## 상표

COPG-VD는 독립적인 비공식 프로젝트입니다. Google LLC와 제휴하거나, 승인받거나, 후원받지 않습니다. "Google", "Google Play", "Play Integrity", "Pixel", "Android" 및 관련 이름과 로고는 Google LLC의 상표입니다. COPG-VD는 전적으로 당신의 기기에서 동작합니다.

## Tags

`Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
