> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · 한국어 · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# 아키텍처

COPG-VD는 Zygisk 모듈입니다: Zygisk 로더가 zygote에 주입하고, 거기서부터 앱 프로세스에 주입하는
작은 네이티브 라이브러리(`libspoof.so`)입니다. 하는 일은 당신이 대상으로 하는 프로세스에 선택한
디바이스 identity를 제시하는 것뿐입니다. 앱은 없으며, 선택적인 프로파일 가져오기를 제외하면
네트워크도 없습니다.

## 라이프사이클

1. **zygote 시작.** zygote가 부팅되면 로더가 모듈의 `onLoad`를 호출합니다. 그것은
   `/data/adb/COPG-VD.json`을 한 번 읽습니다: 스코프 구성과 프로파일입니다.
2. **앱 fork.** zygote가 fork하는 모든 앱에 대해, 모듈은 `preAppSpecialize`에서 이 프로세스가
   스코프 내에 있는지 결정합니다:
   - **메인 스코프 내** (`playstore` / `global` / `whitelist` / `blacklist`), 또는
   - **DRM 스코프 내** (`drm_targets`에 나열됨).
   둘 다 아니면, 모듈은 그 프로세스에서 **분리되어**(`dlclose`) 그 안에 흔적을 남기지 않습니다.
3. **Specialize.** 남아 있는 프로세스에 대해서는, 프로세스가 아직 권한이 있는 동안 엔진이
   `postAppSpecialize`에서 적용됩니다.

fork는 zygote의 메모리를 copy-on-write로 상속하므로, 각 앱은 부팅 시 읽힌 config에서 시작합니다.
모듈은 파일이 실제로 변경되었을 때만 대상 프로세스별로 파일을 다시 읽으므로, 새로 시작되거나 다시
열린 앱은 편집된 프로파일을 가져옵니다 - 그러나 스코프 결정 자체는 zygote 시작 시 이루어지므로,
**스코프, 엔진 또는 `drm_targets` 변경에는 재부팅이 필요합니다**.

## 엔진

각각 독립적이며 전환 가능합니다.

- **Build 필드 (`motor_jni`).** 대상 프로세스에서 JNI를 통해 `android.os.Build.*`(및
  `Build.VERSION.*`)를 다시 작성하여, Java 코드가 스푸핑된 값을 읽도록 합니다.
- **속성 후크 (`motor_prop_hook`).** 속성 영역(`prop_virtualizer`)의 clean-room 프로세스별 리맵을
  통해 프로세스에 스푸핑된 시스템 속성을 제시합니다. 이것은 함수 후크가 아니라 메모리 리맵이므로,
  후크된 함수 흔적이 없습니다.
- **resetprop (디바이스 전체).** 시스템 속성을 그룹별로 작성합니다 - identity, version, boot 상태,
  SELinux, adb/usb, anti-emulator, 그리고 정리 패스. boot 스크립트가 그것을 실행합니다. 스코프
  모드에서는 identity와 version 그룹이 제외됩니다(Zygisk가 프로세스별로 전달); boot, lock, SELinux
  그룹은 전역으로 유지되어 디바이스가 일관됩니다.
- **DRM / Widevine (`motor_drm`).** Widevine 보안 수준을 보고하는 `MediaDrm` 메서드
  (`getSecurityLevel`, `getPropertyString`)를 후크하고 구성된 수준을 반환합니다. 후크는 null
  체크되어 있으므로, 잘못된 프로파일은 앱을 충돌시키는 대신 우아하게 저하됩니다. `drm_targets`는 이
  엔진이 메인 스코프와 분리된 자체 앱 리스트에서 실행되도록 합니다.

## config 읽기

주입된 프로세스는 zygote SELinux 도메인에서 실행되며, 기본적으로 `/data/adb`에 도달할 수 없습니다.
모듈은 그것을 허용하는 자체 `sepolicy.rule`을 함께 제공하며, 폴백으로 열린 모듈 디렉터리
(`getModuleDir`)를 통해 config를 읽을 수 있어, Zygisk 빌드가 그 경로 부여를 중단하더라도 계속
작동합니다. 파일은 작은 임베디드 JSON 파서(`jsmn`)로 파싱됩니다; 파싱되지 않는 파일은 모듈이
아무것도 스푸핑하지 않음을 의미합니다.

## 프로파일을 최신으로 유지하기

`fingerprint-update.sh`는 WebUI에서 또는 부팅마다 한 번, 최신 Google factory image로부터 Build
필드를 새로 고칩니다. 모듈 자체의 번들 다운로더(`PATH`의 `curl`/`wget`이 아님)를 사용하고, 사용 전에
모든 값을 검증하며, 절대 뒤로 가지 않고, 다른 디바이스를 스푸핑하는 프로파일을 거부합니다.
`android.os.Build`는 zygote 시작 시 작성되므로, 새 값은 다음 재부팅 시 앱에 도달합니다. 사용자 측에
대해서는 [USER-GUIDE.md](USER-GUIDE.md)를, 필드에 대해서는 [CONFIGURATION.md](CONFIGURATION.md)를
참조하세요.

## Android 버전이 기본적으로 스푸핑되지 않는 이유

`SDK_INT` / `ANDROID_VERSION`을 ROM의 framework의 실제보다 높게 올리면 앱이 존재하지 않는 API를
호출하게 되어, Google의 앱이 충돌하고 전화기가 softloop로 재부팅됩니다. 따라서 version 그룹은
기본적으로 꺼져 있고 `spoof_version` 뒤에서 게이트됩니다. 모듈은 실제 버전을
`/system/build.prop`에서 읽으며, `getprop`에서는 절대 읽지 않습니다. `getprop`이 바로 그것이
위조하는 것이기 때문입니다. [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)의 함정을
참조하세요.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171에 의해 유지 관리됩니다. 수정과 개선을 환영합니다 - [../CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.*
