## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD는 전역 기기 스푸핑을 위해 설계된 모듈입니다.  
즉, 시스템 앱과 기기 전체까지 후킹됩니다.  
  
## 사용 방법
이 모듈을 사용하여 작동하는 FingerPrint를 스푸핑하는 경우, PlayIntegrityFix나 GooglePhotosUnlimited를 사용할 필요가 없습니다.  
### JSON 설정 파일 예시  
`/data/adb/COPG-VD.json`
* 모든 필드는 선택 사항입니다. 어떤 필드가 제공되지 않으면 건너뜁니다.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
문자열은 반드시 큰따옴표만 사용하세요.  
위 블록과 `module/COPG-VD.json.example`은 [Update COPG-VD.json](.github/workflows/update-json.yml) workflow에 의해 매일 갱신되며, Google의 최신 공장 이미지에서 바로 가져옵니다.  
### fingerprint를 최신으로 유지하기  
`fingerprint-update.sh`는 그 파일을 받아서 설정을 갱신합니다. WebUI(**Check Update** / **Update Now**)를 통하거나, **부팅당 한 번씩**(**Auto-update JSON on boot**, 기본적으로 켜짐) 스스로 수행합니다.  
* `/data/adb/COPG-VD.json`과 `/data/adb/modules/COPG-VD/COPG-VD.json` 둘 다 존재하면 둘 다 갱신되며, 이전 내용은 `.bak`으로 보관됩니다.  
* build 필드(fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user)만 다시 작성됩니다. 사용자가 직접 설정한 나머지는 모두 보존됩니다: 추가 키, `BOOTLOADER`/`BOARD`/`HARDWARE`, 다른 객체, 키 순서와 서식.  
* 절대 뒤로 가지 않습니다: 설치된 것보다 오래된 upstream build는 거부됩니다. 이는
  일상적인 일이며(저장소가 사용자가 손으로 갱신한 설정보다 뒤처질 수 있음), Android에서
  가장 중요한 보호 장치이기도 합니다. Android에서 사용 가능한 유일한 다운로더는 busybox `wget`이며, 이는
  TLS 인증서를 검증할 수 없기 때문입니다 - 같은 이유로 모든 값은 사용 전에 검증됩니다.  
* 사용자의 프로필이 **다른 기기**(`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`가 다름)를 스푸핑하는 경우, 아무것도 적용되지 않습니다 - 다른 프로필에 Pixel fingerprint를 쓰는 것은 오래된 fingerprint보다 더 나쁩니다.  
* 부팅 시에는 백그라운드에서 실행되며 약 10분 동안 계속 재시도합니다. 부팅이 끝날 때 보통 wifi가 아직 올라오지 않았기 때문입니다. 부팅을 절대 지연시키지 않습니다.  
* `resetprop`은 갱신 직후 다시 적용되지만, `android.os.Build`는 zygote가 시작될 때 zygisk 모듈이 작성합니다: 새 값이 앱에 도달하려면 **재부팅**하세요.  
* 로그는 `/data/adb/COPG-VD.update.log`에 있습니다.  
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
### 설정 안의 설정  
`COPG-VD.json`은 `COPG-VD-Settings` 객체를 담을 수 있습니다 - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - 이를 통해 사용자의 선택이 백업과 함께 이동하고 손으로 편집할 수 있습니다. WebUI는 그것과 부팅 스크립트가 읽는 플래그 파일 둘 다를 작성합니다. `"spoof_version": "force"`는 파일에서 읽을 때 거부되고 강등됩니다: 오래된 백업을 복원하는 것이 몰래 그것을 다시 작동시켜서는 안 됩니다.  
### WebUI  
JSON 설정 파일을 직접 편집한다면 WebUI를 사용할 필요가 없습니다.  
Magisk 사용자라면 KOW의 KsuWebUI를 사용하세요(https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
resetprop 사용을 끄고 Build info 스푸핑만 켭니다.  
#### Use ro.product.manufacturer:  
Disclosure root 탐지 앱의 "Found device spoofing" 탐지가 신경 쓰인다면 끄세요.  

## 연락처

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
