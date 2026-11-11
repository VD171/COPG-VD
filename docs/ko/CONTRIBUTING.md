> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · 한국어 · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# COPG-VD에 기여하기

도와주셔서 감사합니다! COPG-VD는 기여하기 쉽도록 만들어졌습니다. 이 가이드는 물건들이 어디에
있는지와 우리가 따르는 몇 가지 관례를 알려줍니다.

## 한눈에 보는 프로젝트

COPG-VD는 **Zygisk 디바이스 스푸퍼**입니다: 디바이스의 fingerprint와 build를 다시 작성하기 위해 앱
프로세스에 주입되는 작은 네이티브 라이브러리와, 그것을 조작하는 바닐라 JS WebUI입니다. COPG
(AlirezaParsi 제작)의 포크로, VD171이 Apache-2.0 라이선스 하에 유지 관리합니다.
[ARCHITECTURE.md](ARCHITECTURE.md)와 [FILE-STRUCTURE.md](FILE-STRUCTURE.md)를 참조하세요.

기본적으로 Zygisk를 통해 스푸핑을 Google Play 스택으로 한정하므로, PlayIntegrityFix의 더 가볍고 더
견고한 대안입니다.

## AI 기여자를 환영합니다

AI 어시스턴트와 에이전트는 여기서 나중에 생각난 것이 아니라 일급 기여자입니다.

- 프로젝트는 읽기 쉽도록 만들어졌습니다: 구성은 단일 JSON 파일
  (`/data/adb/COPG-VD/COPG-VD.json`, [CONFIGURATION.md](CONFIGURATION.md)에 문서화됨)이고, 엔진은 작고
  자체 완결적이며, 레이아웃은 [FILE-STRUCTURE.md](FILE-STRUCTURE.md)에 있습니다.
- AI 지원 패치는 다른 것과 동일한 조건으로 검토되고 수락됩니다 - 누가(또는 무엇이) 작성했는지가
  아니라 정확성, 명확성, 아래의 관례에 따라.
- 모두에게 동일한 기준: 실제 기능은 절대 약화되지 않고, 스푸핑은 일관성을 유지하며, 비밀스럽거나
  디바이스별인 것은 아무것도 리포지토리에 들어가지 않습니다([.gitignore](../../.gitignore) 참조).

## 개발 설정

- 테스트하려면 Zygisk(KernelSU, APatch 또는 Magisk)를 갖춘 루팅된 디바이스나 에뮬레이터가 필요합니다.
- NDK(r29)와 CMake로 ABI별로 네이티브 라이브러리를 빌드하세요 - 정확한 명령은
  [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml)의 `Build zygisk libraries`
  단계를 참조하세요. CI가 당신을 위해 세 가지 ABI 모두를 빌드합니다.
- 플래시 가능한 zip을 빌드하세요: 빌드된 `libspoof.so`를 `module/zygisk/<abi>.so`로 복사한 다음,
  `cd module && zip -r9 ../COPG-VD-dev.zip .`를 실행하고 플래시하세요.
- WebUI는 `module/webroot/`입니다(root 관리자에서 엽니다). 스푸핑 로직은 `zygisk/spoof_module.cpp`;
  프로파일 가져오기는 `module/fingerprint-update.sh`입니다.

## 관례

- **모든 모듈 소스 파일**(`.cpp`, `.sh`, `.js`, `.css`, `.html`)은 프로젝트 배너 헤더로 시작합니다
  (기존 파일에서 복사하세요). `.github/` 아래의 툴링은 대신 짧은 주석을 사용합니다.
- **코드와 주석은 영어로.** 주석은 최소한으로, 필요한 곳에만 유지하세요.
- **em-dash나 en-dash 없이**; 항상 단순한 하이픈 `-`를 사용하세요.
- WebUI는 **바닐라 JS**(하나의 `scripts.js`)입니다; 프레임워크 없음.
- 실제 기능을 **절대 약화시키지 마세요**: 스푸핑을 일관되게 유지하고, 후크가 붙어 있는 앱을
  충돌시키지 마세요(의도적으로 null 체크되어 있습니다).

## 국제화 (i18n)

- UI 문자열은 `module/webroot/lang/`에 있습니다. 영어가 정식 폴백(`en.js` + `en.json`)입니다; 다른
  20개 언어는 `<code>.json`입니다.
- 문자열을 추가하거나 변경하려면: `en.js` **와** `en.json`을 편집한 다음, 모든 `<code>.json`을
  업데이트하세요. 보이는 레이블을 건드리는 것은 **모든** 언어 파일과 **모든** `README.<code>.md`를
  업데이트하는 것을 의미합니다.
- 번역은 일반 JSON입니다 - 훌륭한 첫 기여입니다.

## 커밋 및 PR

- PR을 집중시키세요. 무엇을 왜 했는지 설명하세요.
- 커밋에 서명하세요(DCO): `git commit -s` (`Signed-off-by:`를 추가).
- CI는 녹색으로 유지되어야 합니다. 리뷰에서 친절하게 - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를
  참조하세요.

## 좋은 첫 issue

`good first issue`와 `help wanted` 라벨을 찾으세요. 번역, 문서, 새 Pixel 프로파일은 모두 훌륭한
출발점입니다.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171에 의해 유지 관리됩니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.*
