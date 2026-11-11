> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · Deutsch · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Beitragen zu COPG-VD

Danke für Ihre Hilfe! COPG-VD soll leicht beizutragen sein. Diese Anleitung sagt Ihnen,
wo die Dinge liegen, und die wenigen Konventionen, denen wir folgen.

## Das Projekt auf einen Blick

COPG-VD ist ein **Zygisk-Device-Spoofer**: eine kleine native Bibliothek, die in App-Prozesse
injiziert wird, um den Geräte-Fingerprint und den Build umzuschreiben, plus eine Vanilla-JS-WebUI zu dessen
Steuerung. Es ist ein Fork von COPG (von AlirezaParsi), gepflegt von VD171 unter der Apache-2.0-
Lizenz. Siehe [ARCHITECTURE.md](ARCHITECTURE.md) und [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Standardmäßig begrenzt es den Spoof über Zygisk auf den Google-Play-Stack, sodass es eine
leichtere, robustere Alternative zu PlayIntegrityFix ist.

## KI-Beitragende willkommen

KI-Assistenten und -Agenten sind hier erstklassige Beitragende, kein nachträglicher Gedanke.

- Das Projekt ist darauf ausgelegt, lesbar zu sein: die Konfiguration ist eine einzige JSON-Datei
  (`/data/adb/COPG-VD/COPG-VD.json`, dokumentiert in [CONFIGURATION.md](CONFIGURATION.md)),
  die Engines sind klein und eigenständig, und das Layout steht in [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- KI-gestützte Patches werden zu denselben Bedingungen geprüft und akzeptiert wie alle anderen - nach
  Korrektheit, Klarheit und den Konventionen unten, nicht danach, wer (oder was) sie geschrieben hat.
- Dieselbe Messlatte für alle: eine echte Funktion wird nie geschwächt, der Spoof bleibt kohärent, und
  nichts Geheimes oder Gerätespezifisches landet im Repo (siehe die [.gitignore](../../.gitignore)).

## Dev-Setup

- Sie brauchen ein gerootetes Gerät oder einen Emulator mit Zygisk (KernelSU, APatch oder Magisk) zum Testen.
- Bauen Sie die native Bibliothek pro ABI mit dem NDK (r29) und CMake - siehe den Schritt `Build zygisk
  libraries` in [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) für
  den genauen Befehl. CI baut alle drei ABIs für Sie.
- Bauen Sie ein flashbares Zip: kopieren Sie die gebaute `libspoof.so` in `module/zygisk/<abi>.so`, dann
  `cd module && zip -r9 ../COPG-VD-dev.zip .` und flashen Sie es.
- Die WebUI ist `module/webroot/` (öffnen Sie sie aus dem Root-Manager). Die Spoofing-Logik ist
  `zygisk/spoof_module.cpp`; der Profilabrufer ist `module/fingerprint-update.sh`.

## Konventionen

- **Jede Modul-Quelldatei** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) beginnt mit dem
  Projekt-Banner-Header (kopieren Sie ihn aus einer beliebigen bestehenden Datei). Tooling unter `.github/` verwendet
  stattdessen einen kurzen Kommentar.
- **Code und Kommentare in Englisch.** Halten Sie Kommentare minimal und nur dort, wo nötig.
- **Kein Em-Dash oder En-Dash**; verwenden Sie immer einen einfachen Bindestrich `-`.
- Die WebUI ist **Vanilla JS** (eine `scripts.js`); keine Frameworks.
- **Schwächen Sie nie** eine echte Funktion: halten Sie den Spoof kohärent, und bringen Sie die Hooks
  nicht dazu, eine App zum Absturz zu bringen, an die sie angehängt sind (sie sind absichtlich null-geprüft).

## Internationalisierung (i18n)

- UI-Strings liegen in `module/webroot/lang/`. Englisch ist der kanonische Fallback
  (`en.js` + `en.json`); die anderen 20 Sprachen sind `<code>.json`.
- Um einen String hinzuzufügen oder zu ändern: bearbeiten Sie `en.js` **und** `en.json`, dann aktualisieren Sie jede
  `<code>.json`. Ein sichtbares Label anzufassen bedeutet, **alle** Sprachdateien und
  **alle** `README.<code>.md` zu aktualisieren.
- Übersetzungen sind reines JSON - ein großartiger erster Beitrag.

## Commits & PRs

- Halten Sie PRs fokussiert. Beschreiben Sie das Was und Warum.
- Signieren Sie Ihre Commits (DCO): `git commit -s` (fügt `Signed-off-by:` hinzu).
- CI muss grün bleiben. Seien Sie freundlich in Reviews - siehe [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Gute erste Issues

Halten Sie Ausschau nach den Labels `good first issue` und `help wanted`. Übersetzungen, Dokumentation und neue
Pixel-Profile sind allesamt großartige Ausgangspunkte.

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [CONTRIBUTING.md](CONTRIBUTING.md).*
