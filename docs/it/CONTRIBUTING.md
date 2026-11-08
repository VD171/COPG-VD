> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · Italiano · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuire a COPG-VD

Grazie per l'aiuto! COPG-VD è pensato per essere facile a cui contribuire. Questa guida ti dice
dove si trovano le cose e le poche convenzioni che seguiamo.

## Il progetto in breve

COPG-VD è uno **spoofer di dispositivo Zygisk**: una piccola libreria nativa che viene iniettata nei processi
delle app per riscrivere il fingerprint e la build del dispositivo, più una WebUI in vanilla-JS per pilotarlo.
È un fork di COPG (di AlirezaParsi), mantenuto da VD171 sotto la licenza Apache-2.0.
Vedi [ARCHITECTURE.md](ARCHITECTURE.md) e [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Di default limita lo spoof allo stack di Google Play tramite Zygisk, quindi è un'alternativa
più leggera e più robusta a PlayIntegrityFix.

## I contributori AI sono benvenuti

Gli assistenti e agenti AI qui sono contributori di prima classe, non un ripensamento.

- Il progetto è costruito per essere leggibile: la configurazione è un singolo file JSON
  (`/data/adb/COPG-VD.json`, documentato in [CONFIGURATION.md](CONFIGURATION.md)),
  i motori sono piccoli e autocontenuti, e il layout è in [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Le patch assistite dall'AI vengono revisionate e accettate alle stesse condizioni di qualsiasi altra - per
  correttezza, chiarezza e le convenzioni qui sotto, non per chi (o cosa) le ha scritte.
- Stesso standard per tutti: una vera funzionalità non viene mai indebolita, lo spoof resta coerente, e
  nulla di segreto o specifico del dispositivo finisce nel repo (vedi il [.gitignore](../../.gitignore)).

## Setup di sviluppo

- Ti serve un dispositivo o emulatore rootato con Zygisk (KernelSU, APatch o Magisk) per testare.
- Compila la libreria nativa per ABI con l'NDK (r29) e CMake - vedi lo step `Build zygisk
  libraries` in [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) per
  il comando esatto. La CI compila tutte e tre le ABI per te.
- Costruisci uno zip flashabile: copia la `libspoof.so` compilata in `module/zygisk/<abi>.so`, poi
  `cd module && zip -r9 ../COPG-VD-dev.zip .` e flashalo.
- La WebUI è `module/webroot/` (aprila dal root manager). La logica di spoofing è
  `zygisk/spoof_module.cpp`; il fetcher del profilo è `module/fingerprint-update.sh`.

## Convenzioni

- **Ogni file sorgente del modulo** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) inizia con l'header
  del banner del progetto (copialo da qualsiasi file esistente). Il tooling sotto `.github/` usa
  invece un commento breve.
- **Codice e commenti in inglese.** Mantieni i commenti minimi e solo dove servono.
- **Nessun em-dash o en-dash**; usa sempre un semplice trattino `-`.
- La WebUI è **vanilla JS** (un unico `scripts.js`); nessun framework.
- **Non indebolire mai** una vera funzionalità: mantieni lo spoof coerente, e non far
  crashare un'app a cui gli hook sono attaccati (sono null-checked di proposito).

## Internazionalizzazione (i18n)

- Le stringhe della UI si trovano in `module/webroot/lang/`. L'inglese è il fallback canonico
  (`en.js` + `en.json`); le altre 20 lingue sono `<code>.json`.
- Per aggiungere o cambiare una stringa: modifica `en.js` **e** `en.json`, poi aggiorna ogni
  `<code>.json`. Toccare un'etichetta visibile significa aggiornare **tutti** i file di lingua e
  **tutti** i `README.<code>.md`.
- Le traduzioni sono semplice JSON - un ottimo primo contributo.

## Commit e PR

- Mantieni le PR focalizzate. Descrivi cosa e perché.
- Firma i tuoi commit (DCO): `git commit -s` (aggiunge `Signed-off-by:`).
- La CI deve restare verde. Sii gentile nelle revisioni - vedi [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Buone prime issue

Cerca le label `good first issue` e `help wanted`. Traduzioni, documentazione e nuovi
profili Pixel sono tutti ottimi punti di partenza.

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [CONTRIBUTING.md](CONTRIBUTING.md).*
