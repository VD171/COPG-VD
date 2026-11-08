> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · 한국어 · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# 사용자 가이드

COPG-VD는 디바이스의 fingerprint와 build를 다시 작성하여 선택한 앱이 실제 디바이스 대신 Pixel을
보도록 합니다. 이 가이드는 설치부터 작동하는 설정까지, 그리고 그 과정의 선택지들을 안내합니다.
모든 필드와 값에 대해서는 [CONFIGURATION.md](CONFIGURATION.md)를, 내부 작동 방식에 대해서는
[ARCHITECTURE.md](ARCHITECTURE.md)를 참조하세요.

## 설치

1. KernelSU, APatch 또는 Magisk에서 zip을 플래시하고 재부팅합니다.
2. Zygisk가 활성화되어 있어야 합니다(내장형 또는 ReZygisk / Zygisk Next). Magisk 사용자: Zygisk를 활성화하세요.
3. 모듈은 Pixel 프로파일을 함께 제공하므로, 재부팅 직후 Google Play 스택은 이미 그 Pixel을
   봅니다. 작동하는 fingerprint가 있으면 PlayIntegrityFix나 GooglePhotosUnlimited가 필요하지 않습니다.

모듈을 조작하려면 root 관리자에서 WebUI를 엽니다. Magisk 사용자는
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases)으로 엽니다. 모든 것은
`/data/adb/COPG-VD.json`에서 직접 편집할 수도 있습니다.

## 누가 스푸핑을 보는가 (스코프)

`scope_mode`는 어떤 프로세스가 스푸핑된 identity를 받는지 결정합니다. 스코프 모드에서는 identity가
Zygisk에 의해 프로세스별로 전달되며, 전역 속성을 통해 시스템의 나머지 부분으로 **누출되지 않습니다**.

| 모드 | 누가 스푸핑을 받는가 |
|---|---|
| `playstore` (기본값) | Play 스택만: Google Play services, 그 unstable 프로세스, Play Store. |
| `global` | 디바이스 전체: 모든 프로세스. |
| `whitelist` | `scope_whitelist`에 나열된 앱만. |
| `blacklist` | `scope_blacklist`에 있는 것을 제외한 모든 앱. |

`playstore`로 시작하세요. 가장 가벼운 옵션이며, 관련 없는 앱에 스푸핑을 노출하지 않고 Play
Integrity를 통과하는 옵션입니다.

## 엔진

각 엔진은 독립적이며 끌 수 있습니다. DRM을 제외하고 모두 기본적으로 켜져 있습니다.

- **Build 필드 (`motor_jni`)** - 대상 프로세스에서 `android.os.Build.*`를 다시 작성합니다. 이것이
  대부분의 앱이 읽는 것입니다.
- **속성 후크 (`motor_prop_hook`)** - 속성 영역의 clean-room 프로세스별 리맵을 통해 대상 프로세스에
  스푸핑된 시스템 속성을 제시합니다(함수 후크 없음).
- **resetprop** - 시스템 속성을 디바이스 전체에서 그룹별(identity, version, boot 상태, SELinux,
  adb/usb, anti-emulator 및 정리 패스)로 다시 작성합니다. 스코프 모드에서는 identity와 version 그룹이
  디바이스 전체 패스에서 제외됩니다(Zygisk가 프로세스별로 전달); boot, lock, SELinux 그룹은 전역으로
  유지됩니다. `COPG-VD-Settings.resetprop`에서 전환합니다.
- **DRM / Widevine (`motor_drm`, 기본적으로 꺼짐)** - 선택한 Widevine 보안 수준(L1 또는 L3)을 그것을
  읽는 앱에 보고합니다. 아래 DRM 섹션을 참조하세요.

## fingerprint를 최신으로 유지하기

fingerprint는 낡습니다: Google이 factory image를 교체하고, 오래된 것은 서서히 가치를 잃습니다.
`fingerprint-update.sh`는 최신 Google factory image로부터 당신의 것을 최신으로 유지합니다.

- WebUI에서 (Tools 탭): **Check Update** 및 **Update Now**.
- 자체적으로, **부팅마다 한 번**: **Auto-update JSON on boot** (기본적으로 켜짐). 백그라운드에서
  실행되며, 부팅 시 보통 wifi가 아직 올라오지 않았기 때문에 약 10분 동안 재시도를 계속하고, 부팅을
  절대 지연시키지 않습니다.
- Build 필드(fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user)만
  다시 작성합니다. 당신이 커스터마이징한 모든 것은 유지되며, 이전 내용은 `.bak`로 저장됩니다.
- 절대 뒤로 가지 않으며(더 오래된 upstream build는 거부됨), 프로파일이 다른 디바이스를 스푸핑하는
  경우 아무것도 적용하지 않습니다 - 다른 프로파일 위의 Pixel fingerprint는 오래된 것보다 나쁩니다.
- `resetprop`는 업데이트 직후 다시 적용되지만, `android.os.Build`는 zygote가 시작될 때 작성되므로
  새 값이 앱에 도달하려면 **재부팅**하세요. 로그: `/data/adb/COPG-VD.update.log`.

## Android 버전 함정

제대로 맞추기 가장 어려운 것. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL`, `CODENAME`은 스푸핑하는
디바이스가 아니라 **당신의 ROM**을 설명합니다. 앱에게 SDK가 framework의 실제보다 최신이라고 말하면
존재하지 않는 API를 호출하게 됩니다: Google의 앱이 충돌하고, 전화기가 재부팅되고, 다시 시작됩니다.
부팅 자체는 완료되므로, boot 로그에 아무것도 남기지 않는 **softloop**입니다.

이 필드들은 제공되는 config에 없으며 updater는 절대 작성하지 않습니다. **Spoof Android version**
(`COPG-VD-Settings.spoof_version`)이 이것들이 애초에 적용되는지를 결정합니다:

- `never` (기본값) - ROM 자체의 버전이 사용됩니다.
- `rom` - ROM을 초과하지 않는 것만 적용하며, 실제로는 SDK를 낮추는 것을 의미합니다.
- `force` - config가 말하는 그대로 정확히 적용합니다. 이것이 softloop을 일으키는 것입니다; 대상
  framework가 그것을 지원한다는 것을 아는 경우에만 사용하세요.

실제 버전은 `/system/build.prop`에서 읽히며, `getprop`에서는 절대 읽히지 않습니다(그것이 바로 이
모듈이 위조하는 것입니다). `force`는 백업을 복원할 때도 거부되므로, 오래된 백업이 당신 모르게 그것을
다시 무장시킬 수 없습니다.

## DRM / Widevine

기본적으로 꺼짐 (`motor_drm`). 켜져 있으면 선택한 Widevine 수준인 `DRM_SECURITY_LEVEL`(`L1` 또는
`L3`)을 그것을 읽는 앱에 보고합니다.

기본적으로 DRM 스푸핑은 `scope_mode`를 따릅니다. 대신 특정 앱 집합에 적용하려면 - 메인 스코프와
독립적으로 - `drm_targets`에 나열하세요. 그러면 모듈은 나열된 앱이 메인 스코프 밖에 있더라도 DRM
후크를 위해 **오직** 그 앱에 로드된 상태로 유지됩니다; 비어 있거나 없는 리스트는 스코프를 따른다는
의미입니다. 이것은 스코프 모드(`global`이 아님)가 필요하며, 다음 **재부팅** 시 적용됩니다.

## Analyze: 설정 확인

WebUI의 **Analyze**(또는 `fingerprint-update.sh analyze`)는 현재 상태의 config를 감사하고 앱이
알려주기 전에 무엇이 잘못되었는지 알려줍니다:

- ROM에 대한 버전 (softloop이 발생할까?),
- 파일이 여전히 파싱되는지(깨진 것은 모듈이 **아무것도** 스푸핑하지 않게 만들고, logcat만이 그것을
  알려줄 것입니다),
- fingerprint가 그 주변 필드와 일치하는지,
- 모듈이 읽지 않는 키, 의심스러운 날짜, 그리고 라이브 속성이 이미 config가 요구하는 것을 담고 있는지.

config를 손으로 편집할 때마다 실행하세요.

## WebUI

선택 사항이지만, 모든 것을 조작하는 쉬운 방법입니다. 다섯 개의 탭:

- **About** - 모듈 및 버전 정보.
- **Device** - 모든 Build 필드, 상태별로 설정되고 카테고리별로 그룹화됨.
- **Spoofing** - 스코프 모드와 엔진 스위치.
- **System** - resetprop 그룹.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, 부팅 자동 업데이트, 그리고
  Diagnostics 보고서(버그 보고서에 유용한 모든 것을 읽고 내보내는 하나의 버튼).

네트워크 요청을 하지 않습니다; 필요한 모든 것이 모듈 안에 함께 제공됩니다.

## 문제 해결

- **앱이 여전히 실제 디바이스를 봅니다.** 스코프를 확인하세요: `playstore`에서는 Play 스택만
  커버됩니다. config가 파싱되는지 확인하세요(Analyze 실행). 엔진, `drm_targets` 또는 프로파일을
  변경한 후에는 **재부팅**하세요 - Zygisk는 zygote가 시작될 때 스코프를 읽습니다.
- **Play Integrity가 여전히 실패합니다.** fingerprint가 최신인지(Check Update) 확인하고,
  `SECURITY_PATCH`가 `global_fields`에 있어 디바이스 전체에서 일관성을 유지하는지 확인하세요. Google
  Play services를 종료하여 다시 인증하도록 하세요.
- **버전 스푸핑을 활성화한 후 전화기가 softloop합니다.** 그것은 위의 Android 버전 함정입니다 -
  `spoof_version`을 `never`로 다시 설정하세요.
- **Magisk에서 WebUI가 열리지 않습니다.** [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases)을 사용하세요.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171에 의해 유지 관리됩니다. 수정과 개선을 환영합니다 - [../CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.*
