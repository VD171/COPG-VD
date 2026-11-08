> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · Português · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Estrutura de arquivos

Onde tudo fica no repositório.

```
COPG-VD/
├── zygisk/                     # fonte nativa (compilada em libspoof.so, por ABI)
│   ├── spoof_module.cpp        # o módulo Zygisk: escopo, motores, configuração
│   ├── prop_virtualizer.cpp    # remapeamento clean-room de propriedades por processo (hook de prop)
│   ├── prop_virtualizer.hpp
│   ├── atexit.cpp              # vendored (AOSP)
│   ├── jsmn.h                  # parser JSON vendored (MIT)
│   └── CMakeLists.txt
│
├── module/                     # o módulo flashável
│   ├── module.prop             # id, name, version, versionCode, updateJson
│   ├── customize.sh            # configuração em tempo de instalação
│   ├── service.sh              # boot: aplica os grupos resetprop de todo o dispositivo
│   ├── uninstall.sh            # remove o módulo e seu estado transitório
│   ├── fingerprint-update.sh   # buscador de perfil + Analyze
│   ├── sepolicy.rule           # permite o processo injetado ler a configuração
│   ├── update.json             # manifesto do atualizador in-app
│   ├── COPG-VD.json.example     # uma configuração de exemplo documentada
│   ├── zygisk/<abi>.so         # biblioteca compilada (adicionada pelo CI na hora do empacotamento)
│   ├── META-INF/               # stub do instalador
│   ├── system/                 # arquivos montados no sistema
│   └── webroot/                # a WebUI
│       ├── index.html  scripts.js  i18n.js  styles.css  fonts.css  config.json
│       ├── marked.min.js  icon.png
│       └── lang/               # en.js + en.json + 20 traduções <code>.json
│
├── .github/
│   ├── workflows/
│   │   ├── COPG-VD.yml          # build + release (workflow_dispatch)
│   │   ├── update-json.yml      # atualização diária do perfil
│   │   └── wiki-sync.yml        # espelha docs/ para o wiki do GitHub
│   └── scripts/
│       ├── version.sh           # fonte única da versão (module.prop)
│       ├── gen_wiki.sh          # renderiza o wiki a partir de docs/
│       └── update_copg_json.py  # o helper de atualização diária
│
├── tools/                      # documentation and i18n maintenance scripts
│   ├── fix-switchers.py        # set the language switcher on every doc
│   ├── fix-links.py            # normalize cross-doc links per location
│   ├── readme-docs.py          # refresh the README documentation section
│   └── sync-docs-example.py    # keep the docs example on the shipped profile
│
├── docs/                       # documentação (esta pasta)
│   ├── USER-GUIDE.md  CONFIGURATION.md  ARCHITECTURE.md  FILE-STRUCTURE.md
│   └── <code>/                 # os mesmos docs em cada um dos 20 idiomas
│
├── README.md + README.<code>.md   # 21 idiomas
├── CHANGELOG.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                     # Apache-2.0
└── screenshots/                # imagens usadas pelo README
```

## A configuração de runtime (não está no repositório)

`/data/adb/COPG-VD.json` no dispositivo guarda o perfil e as configurações (veja
[CONFIGURATION.md](CONFIGURATION.md)). Nunca é commitado; `module/COPG-VD.json.example`
é o template.

*Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [../CONTRIBUTING.md](CONTRIBUTING.md).*
