> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · Deutsch · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# KI-Agenten: die Steuerfläche

COPG-VD heißt KI- und Agenten-Beiträge willkommen, und das gesamte Modul ist darauf ausgelegt, headless
gesteuert zu werden, ohne die WebUI abzuscrapen. Es gibt zwei Oberflächen, und ein als root laufender
Agent (wie es die WebUI tut) nutzt beide:

1. **Die Konfigurationsdatei** `/data/adb/COPG-VD/COPG-VD.json` - die einzige Quelle der Wahrheit. Jedes
   Profilfeld und jede Einstellung liegt hier; das Lesen und Schreiben dieser Datei ist der Weg, zu ändern,
   was das Modul spooft.
2. **Der Shell-Einstiegspunkt** `fingerprint-update.sh` - ein Skript mit stabilen Verben zum Prüfen,
   Anwenden und Holen von Profilen.

## Die Konfigurationsdatei

`/data/adb/COPG-VD/COPG-VD.json` ist ein schlichtes JSON-Objekt. Das Modul liest sie aus den injizierten
Prozessen über eine eigene SELinux-Regel, die es selbst mitliefert; sie enthält keine Zugangsdaten. Ein
mitgeliefertes Beispiel liegt unter `module/COPG-VD.json.example`, täglich aus dem neuesten
Google-Factory-Image aufgefrischt.

Regeln, die ein Agent befolgen muss:

- **Strings nur in doppelten Anführungszeichen**, wie in JSON.
- **Jedes Feld ist optional.** Ein nicht angegebenes Feld wird übersprungen und der eigene Wert der ROM
  beibehalten.
- Die Top-Level-Schlüssel, die das Modul steuern, sind `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, das `COPG-VD`-Objekt (die Build-Felder),
  eine `COPG-VD-Delete`-Liste und ein `COPG-VD-Settings`-Objekt (`resetprop`, `autoupdate`,
  `spoof_version`). Die [Konfigurationsreferenz](CONFIGURATION.md) dokumentiert jeden einzelnen.
- `"spoof_version": "force"` wird abgelehnt, wenn es aus der Datei auf dem Datenträger stammt, und beim
  Lesen heruntergestuft, sodass das Wiederherstellen eines alten Backups es nicht still erneut scharfschalten
  kann. Setze die Versions-Policy über die Einstellungen, nicht durch handgeschriebenes `force`.
- Führe nach dem Bearbeiten der Datei **`analyze`** aus (unten): Eine Datei, die nicht parst, bewirkt, dass
  das Modul **nichts** spooft, und nur logcat sagt es.

Eine geänderte Konfiguration erreicht Apps beim nächsten Prozessstart. Per `resetprop` gelieferte Properties
können ohne Reboot erneut angewendet werden (`service.sh --props-only`), aber die `android.os.Build.*`-Felder
werden von der Zygisk-Bibliothek geschrieben, wenn zygote startet, daher **ist ein Reboot erforderlich**,
damit diese die Apps erreichen.

## Der Shell-Vertrag

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Das Skript gibt menschenlesbare Zeilen aus; maschinenlesbare beginnen mit `status:`. Sein Exit-Code ist
`0` bei Erfolg und ungleich null bei Fehlschlag.

| Verb | Was es tut | Typische Ausgabe |
|---|---|---|
| `check` | Vergleicht das installierte Profil mit dem neuesten Upstream-Build, schreibt nichts. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Holt das neueste Profil und merged es in die Konfiguration (nur Build-Felder; deine anderen Schlüssel bleiben erhalten). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Prüft die Konfiguration im aktuellen Zustand (Parsen, Version vs. ROM, Fingerprint-Kohärenz, unbekannte Schlüssel, Daten, Props). Gibt einen Bericht aus; der Exit-Code spiegelt rote/Warn-Befunde wider. | ein Textbericht |
| `fetch-index` | Lädt den signierten Geräteindex herunter, verifiziert ihn und gibt ihn aus (`index.json`). | das Index-JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Lädt die `build.prop` eines Geräts herunter (Pfad aus dem Index, z. B. `pixel-9a/latest.prop`) und schreibt dessen Build-Felder in die Konfiguration. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migriert Zustand/Konfiguration vom alten flachen Layout nach `/data/adb/COPG-VD/`. | - |
| `migrate` | Einmalige Konfigurationsmigration zwischen Modulversionen. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Das Auto-Update einmal pro Boot; für `service.sh` gedacht, nicht für interaktiven Gebrauch. | schreibt `update.status` |

Jeder Download wird vor der Verwendung validiert (der einzige On-Device-Downloader ist busybox `wget`, das
TLS nicht validieren kann), und der Profil-Updater geht nie rückwärts: Ein Upstream-Build, der älter ist
als der installierte, wird abgelehnt. Der Feed-Index und jede `.prop` tragen eine abgetrennte
ed25519-Signatur, die verifiziert wird, bevor der Inhalt gelesen wird.

## Typische Agenten-Abläufe

- **Das Profil frisch halten:** `check`; bei `status: update-available` `apply`; dann reboote, damit die
  neuen `Build.*` die Apps erreichen.
- **Zu einem anderen Pixel-Profil wechseln:** `fetch-index`, einen Gerätepfad aus dem Index wählen, `fetch
  <path>`, `analyze` ausführen, um zu bestätigen, dass die Konfiguration kohärent ist, dann reboote.
- **Scope oder eine Engine ändern:** `scope_mode` (oder einen Engine-Schalter) in der Konfigurationsdatei
  bearbeiten, `analyze` ausführen, dann `service.sh --props-only` für per Property gelieferte Änderungen,
  oder reboote für Build-Felder.

## Sicherheitsleitplanken

- Das Ändern der Konfiguration oder das Anwenden eines Profils ändert, was jede anvisierte App sieht;
  bestätige die Absicht vor dem Schreiben, wie es die WebUI tut.
- Lockere nie einen echten Kohärenzschutz: Das SDK ist unter jeder Policy auf das echte Framework gedeckelt,
  der Hersteller bleibt im Gleichschritt mit dem Rest des Profils, und ein Profil für ein anderes Gerät wird
  abgelehnt. Diese sind bewusst gesetzt und dürfen nicht umgangen werden.
- Die Konfiguration ist die unterstützte Oberfläche. Scrape oder automatisiere die WebUI selbst nicht.

<!-- doc-footer -->

---

> _Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen; siehe [CONTRIBUTING.md](CONTRIBUTING.md)._
