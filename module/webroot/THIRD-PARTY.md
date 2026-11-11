# Third-party components

The WebUI bundles the following third-party files. Each is shipped verbatim; the sha256 lets you verify the shipped bytes.

| File | Component | Version | License | Source | sha256 |
|---|---|---|---|---|---|
| `marked.min.js` | Marked | 15.0.12 | MIT | https://github.com/markedjs/marked | `3e7e7d7feb3e5d58cb6c804f68ab5c24cc7e5eb6270fd6e5cbb9124739217d0c` |
| `fonts/poppins-400.woff2` | Poppins | - | OFL-1.1 | https://github.com/itfoundry/Poppins | `7d93459d86585bfcdbb7e0376056226adb25821ee54b96236fe2123e9560929f` |
| `fonts/poppins-500.woff2` | Poppins | - | OFL-1.1 | https://github.com/itfoundry/Poppins | `cd36de204aca2d5fa263a731f7c20009b5e3d754ba1f1e03c33e93a48f3e7446` |
| `fonts/poppins-600.woff2` | Poppins | - | OFL-1.1 | https://github.com/itfoundry/Poppins | `f4e80d9dfd374d02989b87a27b5ed4cb78fbb177c27f1478e9a8b0afb7513149` |
| `fonts/roboto-mono-400.woff2` | Roboto Mono | - | Apache-2.0 | https://github.com/googlefonts/RobotoMono | `e03013e0baa5690a803c188da2214d920c3245b25ad78421ecc8ae86cd842ae9` |

The woff2 files are subsets (only the glyphs the WebUI uses).

- **Marked** is MIT-licensed, Copyright (c) 2011-2025 Christopher Jeffrey; the header is kept inside `marked.min.js`.
- **Poppins** is under the SIL Open Font License 1.1; the full text ships in `fonts/OFL.txt` (Copyright 2014-2019 Indian Type Foundry).
- **Roboto Mono** is under the Apache License 2.0, Copyright Google LLC; the module itself is Apache-2.0 (see `../../LICENSE`).
