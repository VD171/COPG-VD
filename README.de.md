## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD ist ein Geräte-Spoofer: Er schreibt den Geräte-Fingerprint und Build um, sodass Apps das von dir gewählte Gerät sehen statt des echten.  
Er läuft auf Zygisk (KernelSU, APatch oder Magisk) und beschränkt das Spoofing standardmäßig auf den Google-Play-Stack - damit ist er eine leichtere, robustere Alternative zu PlayIntegrityFix.  

## Screenshots

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Wie wird es verwendet?
Installiere das Modul, reboote, und das mitgelieferte Profil (ein Pixel) wird für die betroffenen Apps gespooft. Mit einem funktionierenden Fingerprint brauchst du PlayIntegrityFix oder GooglePhotosUnlimited nicht.  
Alles wird in `/data/adb/COPG-VD.json` oder über die WebUI konfiguriert. Alle Felder sind OPTIONAL - ein Feld, das nicht angegeben wird, wird übersprungen.  

### Scope - wer das Spoofing sieht
`scope_mode` entscheidet, welche Prozesse die gespoofte Identität erhalten. In einem begrenzten Modus wird die Identität von Zygisk pro Prozess geliefert und nicht über die globalen Properties an den Rest des Systems weitergegeben.  
* **Google Play** (`playstore`, der Standard) - nur der Play-Stack (Google Play Services, sein unstable-Prozess und der Play Store).  
* **Global** - das gesamte Gerät; jeder Prozess sieht es.  
* **Whitelist** - nur die Apps in `scope_whitelist`.  
* **Blacklist** - jede App außer denen in `scope_blacklist`.  

### Engines - wie das Spoofing geliefert wird
Jede ist unabhängig und kann abgeschaltet werden:  
* **Build fields (JNI)** - schreibt `android.os.Build.*` in den betroffenen Prozessen um.  
* **Property hook** - präsentiert den betroffenen Prozessen die gespooften System-Properties (ein Clean-Room-Remap des Property-Bereichs pro Prozess, kein Funktions-Hook).  
* **resetprop** - schreibt die System-Properties um, gruppenweise verwaltet: Identität, Version, Boot-Status, SELinux, adb/usb, Anti-Emulator und ein Aufräum-Durchlauf. In einem begrenzten Modus bleiben die Gruppen Identität und Version aus dem geräteweiten resetprop heraus (Zygisk liefert sie pro Prozess); die Gruppen boot/lock/SELinux bleiben global.  
* **DRM / Widevine** (standardmäßig aus) - meldet den Apps, die ihn lesen, eine gewählte Widevine-Sicherheitsstufe, L1 oder L3.  

### Fields - setzen, leeren, löschen oder überspringen
Innerhalb des `COPG-VD`-Objekts hat jedes Build-Feld vier Zustände:  
* **Set** - `"KEY": "value"` schreibt den Wert.  
* **Empty** - `"KEY": ""` schreibt einen leeren Wert.  
* **Delete** - führe den Schlüssel in einem `"COPG-VD-Delete": [ ... ]` auf oberster Ebene auf, um ihn zu entfernen (ein Build-Feld wird null, eine Property wird mit `resetprop --delete` entfernt).  
* **Skip** - lass den Schlüssel ganz weg; der eigene Wert der ROM bleibt erhalten.  

Eine `"global_fields": [ ... ]`-Liste wendet die genannten Build-Felder auch in einem begrenzten Modus geräteweit an, um einen Wert überall konsistent zu halten - nur für kohärenzsichere Felder (zum Beispiel den Security Patch), niemals für die Identität und niemals für die Android-Versions-Gruppe.  

### Beispiel-JSON-Konfigurationsdatei
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.260918.007-factory-f5955275.zip",
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.260918.007/16484274:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.260918.007",
    "ID": "ZP11.260918.007",
    "HOST": "51b22e6d8afb",
    "INCREMENTAL": "16484274",
    "TIMESTAMP": "1790806751",
    "PREVIEW_SDK": "20261007",
    "USER": "android-build",
    "SDK_FINGERPRINT": "d9ad4b00fa641d6e43c42cc969f49492",
    "UUID": "_mQOcxvuFzRVZAjNEr2UUUpk2fv0mqDc8RpFyaeJjuk",
    "SECURITY_PATCH": "2026-10-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "global_fields": ["SECURITY_PATCH"]
}
```
Achte darauf, Strings ausschließlich in doppelten Anführungszeichen zu verwenden.  
Der Block oben und `module/COPG-VD.json.example` werden täglich durch den Workflow [Update COPG-VD.json](.github/workflows/update-json.yml) aktualisiert, direkt aus dem neuesten Google-Factory-Image.  

### Den Fingerprint aktuell halten
`fingerprint-update.sh` lädt diese Datei und aktualisiert deine Konfiguration, über die WebUI (**Check Update** / **Update Now**) oder von selbst **einmal pro Boot** (**Auto-update JSON on boot**, standardmäßig aktiviert).  
* Sowohl `/data/adb/COPG-VD.json` als auch `/data/adb/modules/COPG-VD/COPG-VD.json` werden aktualisiert, wenn beide vorhanden sind, und der vorherige Inhalt wird als `.bak` aufbewahrt.  
* Nur die Build-Felder werden neu geschrieben (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Alles andere, das du angepasst hast, bleibt erhalten: zusätzliche Schlüssel, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, andere Objekte, Schlüsselreihenfolge und Formatierung.  
* Es geht niemals rückwärts: ein Upstream-Build, der älter ist als der installierte, wird abgelehnt. Das ist
  normal (das Repo kann hinter einer Konfiguration liegen, die du von Hand aktualisiert hast) und es ist auch der Schutz, der
  auf Android am wichtigsten ist, wo der einzige verfügbare Downloader busybox `wget` ist, das keine
  TLS-Zertifikate prüfen kann - aus demselben Grund wird jeder Wert vor der Verwendung validiert.  
* Wenn dein Profil **ein anderes Gerät** spooft (abweichende `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), wird nichts angewendet - ein Pixel-Fingerprint auf einem anderen Profil ist schlimmer als ein alter Fingerprint.  
* Beim Boot läuft es im Hintergrund und versucht es etwa 10 Minuten lang immer wieder, weil WLAN meist noch nicht verfügbar ist, wenn der Boot abgeschlossen ist. Es verzögert den Boot niemals.  
* `resetprop` wird direkt nach einem Update erneut angewendet, aber `android.os.Build` wird vom Zygisk-Modul geschrieben, wenn Zygote startet: **reboote**, damit die neuen Werte die Apps erreichen.  
* Log unter `/data/adb/COPG-VD.update.log`.  

### Android-Version - und warum sie nicht gespooft wird
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` und `CODENAME` beschreiben **deine ROM**, nicht das gespoofte Gerät. Apps vorzugaukeln, das SDK sei neuer als das Framework tatsächlich ist, bringt sie dazu, APIs aufzurufen, die nicht existieren: Googles Apps stürzen ab, das Telefon rebootet und fängt von vorn an. Der Boot selbst wird abgeschlossen, daher ist es ein **Softloop** und in den Boot-Logs taucht nichts auf.  
* Sie stehen nicht in der ausgelieferten Konfiguration und der Updater schreibt sie nie.  
* **Spoof Android version** in der WebUI entscheidet, ob sie überhaupt angewendet werden:  
  * **Never** (Standard) - die eigene Version der ROM wird verwendet.  
  * **Up to this ROM** - nur das, was sie nicht überschreitet, was in der Praxis bedeutet, das SDK abzusenken.  
  * **Force** - genau das, was die Konfiguration sagt. Das ist es, was den Softloop verursacht.  
* Die echte Version wird aus `/system/build.prop` gelesen, niemals aus `getprop` - genau das ist es, was dieses Modul fälscht.  

### Analyze
**Analyze** in der WebUI (oder `fingerprint-update.sh analyze`) prüft die Konfiguration im aktuellen Zustand: Version gegen die ROM, ob die Datei überhaupt noch geparst werden kann (eine kaputte bewirkt, dass das Modul **nichts** spooft, und nur logcat sagt es), ob der Fingerprint zu den umgebenden Feldern passt, Schlüssel, die das Modul nicht liest, Datumsangaben und ob die Props bereits das enthalten, was die Konfiguration verlangt.  

### WebUI
Die WebUI ist optional - alles kann direkt in der JSON-Konfiguration bearbeitet werden - aber sie ist der einfache Weg, das Modul zu steuern. Sie hat fünf Tabs: **About**, **Device** (jedes Feld, pro Zustand gesetzt, nach Kategorie gruppiert), **Spoofing** (Scope und Engines), **System** (die resetprop-Gruppen) und **Tools** (Analyze, Check Update, Update Now, Backup/Restore und das Auto-Update beim Boot). Sie stellt keine Netzwerkanfrage; alles, was sie braucht, ist im Modul enthalten.  
Wenn du Magisk-Nutzer bist, verwende KsuWebUI von KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Einstellungen in der Konfiguration
`COPG-VD.json` trägt seine Einstellungen direkt neben dem Profil, damit deine Entscheidungen mit einem Backup reisen und von Hand bearbeitet werden können: `scope_mode`, die Engine-Schalter, die resetprop-Gruppen, `global_fields` und ein `COPG-VD-Settings`-Objekt (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). Die WebUI schreibt sowohl die Konfiguration als auch die Flag-Dateien, die die Boot-Skripte lesen. `"spoof_version": "force"` wird aus der Datei abgelehnt und heruntergestuft: das Wiederherstellen eines alten Backups darf es nicht hinter deinem Rücken erneut scharfschalten.  

## Kontakte

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
