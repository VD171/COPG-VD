> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · 한국어 · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# 파일 구조

리포지토리 내 모든 것의 위치.

```
COPG-VD/
├── zygisk/                     # 네이티브 소스 (ABI별로 libspoof.so로 빌드됨)
│   ├── spoof_module.cpp        # Zygisk 모듈: 스코프, 엔진, config
│   ├── prop_virtualizer.cpp    # clean-room 프로세스별 속성 리맵 (prop hook)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # vendored JSON 파서 (MIT)
│   └── CMakeLists.txt
│
├── module/                     # 플래시 가능한 모듈
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # 설치 시 설정
│   ├── service.sh              # boot: 디바이스 전체 resetprop 그룹을 적용
│   ├── uninstall.sh            # 모듈과 그 일시적 상태를 제거
│   ├── fingerprint-update.sh   # 프로파일 가져오기 + Analyze
│   ├── sepolicy.rule           # 주입된 프로세스가 config를 읽도록 허용
│   ├── update.json             # 앱 내 updater 매니페스트
│   ├── COPG-VD.json.example     # 문서화된 예시 config
│   ├── zygisk/<abi>.so         # 빌드된 라이브러리 (패키징 시 CI가 추가)
│   ├── META-INF/               # 인스톨러 스텁
│   ├── system/                 # system에 마운트되는 파일
│   └── webroot/                # WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20개의 <code>.json 번역
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # 일일 프로파일 새로 고침
│   │   └── wiki-sync.yml        # docs/를 GitHub wiki로 미러링
│   └── scripts/
│       ├── version.sh           # 버전의 단일 소스 (module.prop)
│       ├── gen_wiki.sh          # docs/에서 wiki를 렌더링
│       └── update_copg_json.py  # 일일 새로 고침 헬퍼
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # 문서 (이 폴더)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # 20개 언어 각각의 동일한 문서
│
├── README.md + README.<code>.md   # 21개 언어
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # README가 사용하는 이미지
```

## 런타임 config (리포지토리에 없음)

디바이스의 `/data/adb/COPG-VD/`는 모듈 자신의 디렉터리입니다: `COPG-VD.json`이 프로파일과 설정을
담고 있으며([CONFIGURATION.md](CONFIGURATION.md) 참조), `update.log`, `update.state`, `update.status`가
함께 있습니다. config는 절대 커밋되지 않습니다; `module/COPG-VD.json.example`이
템플릿입니다.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171에 의해 유지 관리됩니다. 수정과 개선을 환영합니다 - [../CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.*

<!-- doc-footer -->

---

> _이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 유지 관리합니다. 수정 및 개선을 환영합니다. [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요._
