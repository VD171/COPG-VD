> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · Deutsch · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Benutzerhandbuch

COPG-VD schreibt den Geräte-Fingerprint und den Build so um, dass die von dir gewählten Apps
ein Pixel statt deines echten Geräts sehen. Dieses Handbuch führt dich von der Installation zu
einer funktionierenden Einrichtung und durch die Entscheidungen unterwegs. Zu jedem Feld und
Wert siehe [CONFIGURATION.md](CONFIGURATION.md); wie es intern funktioniert, siehe [ARCHITECTURE.md](ARCHITECTURE.md).

## Installation

1. Flashe das Zip in KernelSU, APatch oder Magisk und starte neu.
2. Zygisk muss aktiv sein (eingebaut, oder ReZygisk / Zygisk Next). Magisk-Nutzer: aktiviert Zygisk.
3. Das Modul bringt ein Pixel-Profil mit, sodass direkt nach dem Neustart der Google-Play-Stack
   bereits dieses Pixel sieht. Mit einem funktionierenden Fingerprint brauchst du weder
   PlayIntegrityFix noch GooglePhotosUnlimited.

Öffne die WebUI aus deinem Root-Manager, um das Modul zu steuern. Magisk-Nutzer öffnen sie mit
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Alles lässt sich
auch direkt in `/data/adb/COPG-VD/COPG-VD.json` bearbeiten.

## Wer die Täuschung sieht (Scope)

`scope_mode` entscheidet, welche Prozesse die gefälschte Identität erhalten. In einem Scope-Modus
wird die Identität pro Prozess durch Zygisk ausgeliefert und **gelangt nicht** über globale
Properties in den Rest des Systems.

| Modus | Wer die Täuschung erhält |
|---|---|
| `playstore` (Standard) | Nur der Play-Stack: Google Play services, sein instabiler Prozess und der Play Store. |
| `global` | Das gesamte Gerät: jeder Prozess. |
| `whitelist` | Nur die in `scope_whitelist` aufgeführten Apps. |
| `blacklist` | Jede App außer den in `scope_blacklist` aufgeführten. |

Beginne mit `playstore`. Es ist die leichteste Option und diejenige, die Play Integrity besteht,
ohne die Täuschung unbeteiligten Apps preiszugeben.

## Die Engines

Jede Engine ist unabhängig und kann abgeschaltet werden. Alle sind standardmäßig an, außer DRM.

- **Build-Felder (`motor_jni`)** - schreibt `android.os.Build.*` in den anvisierten
  Prozessen um. Das ist, was die meisten Apps lesen.
- **Property-Hook (`motor_prop_hook`)** - präsentiert den anvisierten Prozessen die
  gefälschten System-Properties, über ein Clean-Room-Remapping des Property-Bereichs pro Prozess
  (kein Funktions-Hook).
- **resetprop** - schreibt die System-Properties geräteweit um, gruppenweise (Identität,
  Version, Boot-State, SELinux, adb/usb, Anti-Emulator und ein Aufräumdurchlauf). In einem
  Scope-Modus bleiben die Gruppen Identität und Version aus dem geräteweiten Durchlauf heraus
  (Zygisk liefert sie pro Prozess); die Gruppen Boot, Lock und SELinux bleiben global. Schalte
  es in `COPG-VD-Settings.resetprop` um.
- **DRM / Widevine (`motor_drm`, standardmäßig aus)** - meldet Apps, die es lesen, eine
  gewählte Widevine-Sicherheitsstufe (L1 oder L3). Siehe Abschnitt DRM unten.

## Den Fingerprint frisch halten

Ein Fingerprint altert: Google rotiert die Werks-Images, und ein alter verliert langsam an Wert.
`fingerprint-update.sh` hält deinen aktuell, aus dem neuesten Google-Werks-Image.

- Aus der WebUI (Tab Tools): **Check Update** und **Update Now**.
- Von selbst, **einmal pro Boot**: **Auto-update JSON on boot** (standardmäßig an). Es läuft im
  Hintergrund, versucht es etwa zehn Minuten lang immer wieder, weil das WLAN beim Boot meist
  noch nicht steht, und verzögert den Boot nie.
- Es schreibt nur die Build-Felder um (Fingerprint, ID, Incremental, Timestamp, Security
  Patch, SDK, UUID, Host, User). Alles von dir Angepasste bleibt erhalten, und der vorherige
  Inhalt wird als `.bak` gespeichert.
- Es geht nie rückwärts (ein älterer Upstream-Build wird abgelehnt), und wenn dein Profil ein
  anderes Gerät vortäuscht, wird nichts angewandt - ein Pixel-Fingerprint auf einem anderen
  Profil ist schlimmer als ein alter.
- `resetprop` wird direkt nach einem Update erneut angewandt, aber `android.os.Build` wird beim
  Zygote-Start geschrieben, also **starte neu**, damit neue Werte die Apps erreichen. Log:
  `/data/adb/COPG-VD/update.log`.

## Die Android-Versions-Falle

Das Schwierigste, richtig hinzubekommen. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` und `CODENAME`
beschreiben **deine ROM**, nicht das Gerät, das du vortäuschst. Apps zu sagen, das SDK sei neuer
als das Framework wirklich ist, lässt sie APIs aufrufen, die nicht existieren: Googles Apps
stürzen ab, das Telefon startet neu, und es beginnt von vorn. Der Boot selbst wird abgeschlossen,
es ist also ein **Softloop**, der nichts in den Boot-Logs hinterlässt.

Diese Felder sind nicht in der mitgelieferten Konfiguration, und der Updater schreibt sie nie.
**Spoof Android version** (`COPG-VD-Settings.spoof_version`) entscheidet, ob sie überhaupt greifen:

- `never` (Standard) - die eigene Version der ROM wird verwendet.
- `rom` - wendet nur an, was die ROM nicht überschreitet, was in der Praxis ein Absenken des SDK bedeutet.
- `force` - wendet genau das an, was die Konfiguration sagt. Das ist, was den Softloop auslöst;
  nutze es nur, wenn du weißt, dass das Ziel-Framework es unterstützt.

Die echte Version wird aus `/system/build.prop` gelesen, nie aus `getprop` (genau das, was
dieses Modul fälscht). `force` wird außerdem beim Wiederherstellen eines Backups abgelehnt, sodass
ein altes Backup es nicht hinter deinem Rücken wieder scharfschalten kann.

## DRM / Widevine

Standardmäßig aus (`motor_drm`). Wenn an, meldet es Apps, die es lesen, eine gewählte
Widevine-Stufe, `DRM_SECURITY_LEVEL` (`L1` oder `L3`).

Standardmäßig folgt die DRM-Täuschung dem `scope_mode`. Um sie stattdessen auf eine bestimmte
App-Menge anzuwenden - unabhängig vom Haupt-Scope - liste sie in `drm_targets`. Das Modul bleibt
dann in einer aufgeführten App **nur** für den DRM-Hook geladen, selbst wenn diese App außerhalb
des Haupt-Scopes liegt; eine leere oder fehlende Liste bedeutet, dem Scope zu folgen. Dies
erfordert einen Scope-Modus (nicht `global`) und greift beim nächsten **Neustart**.

## Analyze: prüfe deine Konfiguration

**Analyze** in der WebUI (oder `fingerprint-update.sh analyze`) prüft die Konfiguration im
aktuellen Zustand und sagt dir, was falsch ist, bevor es eine App tut:

- die Version gegen die ROM (würde es einen Softloop auslösen?),
- ob die Datei noch parst (eine kaputte lässt das Modul **nichts** vortäuschen, und nur logcat
  würde es verraten),
- ob der Fingerprint mit den Feldern um ihn herum übereinstimmt,
- Schlüssel, die das Modul nicht liest, verdächtige Daten, und ob die Live-Properties bereits
  tragen, was die Konfiguration verlangt.

Führe es jedes Mal aus, wenn du die Konfiguration von Hand bearbeitest.

## Die WebUI

Optional, aber der einfache Weg, alles zu steuern. Fünf Tabs:

- **About** - Modul- und Versionsinfo.
- **Device** - jedes Build-Feld, pro Zustand gesetzt und nach Kategorie gruppiert.
- **Spoofing** - Scope-Modus und die Engine-Schalter.
- **System** - die resetprop-Gruppen.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, das Auto-Update beim Boot
  und der Diagnostics-Bericht (ein Knopf, um alles für einen Fehlerbericht Nützliche zu lesen und zu exportieren).

Es stellt keine Netzwerkanfrage; alles, was es braucht, wird im Modul mitgeliefert.

## Fehlerbehebung

- **Eine App sieht weiterhin das echte Gerät.** Prüfe den Scope: in `playstore` ist nur der
  Play-Stack abgedeckt. Bestätige, dass die Konfiguration parst (führe Analyze aus). Nach dem
  Ändern von Engines, `drm_targets` oder dem Profil **starte neu** - Zygisk liest den Scope beim
  Zygote-Start.
- **Play Integrity schlägt weiterhin fehl.** Stelle sicher, dass der Fingerprint frisch ist
  (Check Update) und dass `SECURITY_PATCH` in `global_fields` steht, damit er geräteweit
  kohärent bleibt. Beende die Google Play services, damit er sich neu attestiert.
- **Das Telefon geht nach dem Aktivieren des Versions-Spoofings in einen Softloop.** Das ist die
  Android-Versions-Falle oben - setze `spoof_version` zurück auf `never`.
- **Die WebUI öffnet sich auf Magisk nicht.** Nutze [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [../CONTRIBUTING.md](CONTRIBUTING.md).*
