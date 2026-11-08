> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · 한국어 · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# 설정 레퍼런스

모듈 전체는 하나의 파일 `/data/adb/COPG-VD.json`으로 구동됩니다. WebUI가 당신을 위해 그것을
작성하지만, 손으로 편집할 수 있습니다. 제공되는 예시는 `module/COPG-VD.json.example`에 있습니다.

규칙:

- **문자열은 큰따옴표만 사용합니다** (JSON처럼).
- **모든 필드는 선택 사항입니다.** 제공되지 않은 필드는 건너뛰어지고 ROM 자체의 값이 유지됩니다.
- 손으로 편집한 후에는 **Analyze**를 실행하세요: 파싱되지 않는 파일은 모듈이 **아무것도** 스푸핑하지
  않게 만들고, logcat만이 그것을 알려줍니다.

## 최상위 키

| 키 | 타입 | 의미 |
|---|---|---|
| `scope_mode` | string | `playstore` (기본값), `global`, `whitelist` 또는 `blacklist`. [USER-GUIDE.md](USER-GUIDE.md)를 참조하세요. |
| `scope_whitelist` | array | `scope_mode`가 `whitelist`일 때 스푸핑을 받는 패키지. |
| `scope_blacklist` | array | `scope_mode`가 `blacklist`일 때 제외되는 패키지. |
| `COPG-VD` | object | 프로파일: 제시할 Build 필드(아래 참조). |
| `COPG-VD-Delete` | array | 설정이 아니라 제거할 필드 이름(Build 필드는 null이 됨; 속성은 `resetprop --delete`로 제거됨). |
| `COPG-VD-Settings` | object | 프로파일과 함께 이동하는 모듈 설정(아래 참조). |
| `motor_jni` | bool | Build 필드 엔진(`android.os.Build.*`를 다시 작성). 기본값 `true`. |
| `motor_prop_hook` | bool | 프로세스별 속성 엔진(clean-room 속성 리맵). 기본값 `true`. |
| `motor_drm` | bool | DRM / Widevine 엔진. 기본값 `false`. |
| `drm_targets` | array | `scope_mode`와 관계없이 DRM 스푸핑을 받는 앱. 비어 있음 = 스코프를 따름. |
| `global_fields` | array | 스코프 모드에서도 디바이스 전체에 적용되는 Build 필드. 일관성에 안전한 필드만. |
| `process_overrides` | object | 프로세스별 필드 오버라이드: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | 디버깅용 추가 logcat 세부 정보. 기본값 `false`. |

## `COPG-VD` 프로파일 객체

각 항목은 대상 프로세스에 제시되는 디바이스 필드입니다. 일반적인 것들:

| 그룹 | 필드 |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (특별) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

`*_FOR_ATTESTATION` 변형(`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`)은 attestation
경로가 일반 값과 다른 값을 보고할 수 있게 하여 keystore가 일관성을 유지하도록 합니다.

> **version 그룹은 특별합니다.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL`, `CODENAME`은 스푸핑하는
> 디바이스가 아니라 당신의 ROM을 설명합니다. 이것들을 올리면 전화기가 softloop합니다. 이것들은
> 제공되는 프로파일에 없으며 `COPG-VD-Settings.spoof_version`이 허용할 때만 적용됩니다 -
> [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)를 참조하세요.

### 필드 상태

| 상태 | 방법 | 결과 |
|---|---|---|
| Set | `"KEY": "value"` | 값을 작성합니다. |
| Empty | `"KEY": ""` | 빈 값을 작성합니다. |
| Delete | `"COPG-VD-Delete": [ ... ]`의 이름 | 필드를 제거합니다. |
| Skip | 키를 생략 | ROM 자체의 값을 유지합니다. |

### DRM

`DRM_SECURITY_LEVEL`(`L1` 또는 `L3`)은 `motor_drm`이 켜져 있을 때 보고되는 Widevine 수준입니다.

## `COPG-VD-Settings`

프로파일과 함께 이동하는 설정으로, 백업이 당신의 선택을 가지고 갑니다.

| 키 | 타입 / 값 | 의미 |
|---|---|---|
| `resetprop` | bool | 디바이스 전체 resetprop 엔진이 실행되는지 여부. |
| `autoupdate` | bool | `fingerprint-update.sh`가 부팅마다 한 번 실행되는지 여부. 기본적으로 켜짐. |
| `spoof_manufacturer` | bool | manufacturer 필드도 스푸핑되는지 여부. |
| `spoof_version` | `never` / `rom` / `force` | Android version 그룹이 적용되는 방식. `never`가 기본값; `force`는 백업을 복원할 때 거부됩니다. |

## `global_fields`

이 리스트의 Build 필드는 스코프 모드에서도 디바이스 전체에 적용되어 값을 어디서나 일관되게
유지합니다. 일관성에 안전한 필드에만 사용하세요 - security patch가 일반적인 것입니다. identity나
Android version 그룹을 여기에 **절대** 넣지 마세요.

```json
"global_fields": ["SECURITY_PATCH"]
```

## 예시

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171에 의해 유지 관리됩니다. 수정과 개선을 환영합니다 - [../CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.*
