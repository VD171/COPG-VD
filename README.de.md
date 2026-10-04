## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD ist ein Modul fuer globales Geraete-Spoofing.  
Das bedeutet, dass selbst System-Apps und das gesamte Geraet gehookt werden.  
  
## Wie wird es verwendet?
Wenn du dieses Modul nutzt und einen funktionierenden FingerPrint spoofst, sind PlayIntegrityFix oder GooglePhotosUnlimited nicht noetig.  
### Beispiel fuer eine JSON-Konfigurationsdatei  
`/data/adb/COPG-VD.json`
* Alle Felder sind OPTIONAL. Wenn ein Feld nicht angegeben wird, wird es uebersprungen.  
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
Achte darauf, Strings ausschliesslich in doppelten Anfuehrungszeichen zu verwenden.  
Der Block oben und `module/COPG-VD.json.example` werden taeglich durch den Workflow [Update COPG-VD.json](.github/workflows/update-json.yml) aktualisiert, direkt aus dem neuesten Google-Factory-Image.  
### Den Fingerprint aktuell halten  
`fingerprint-update.sh` laedt diese Datei und aktualisiert deine Konfiguration, ueber die WebUI (**Check Update** / **Update Now**) oder von selbst **einmal pro Boot** (**Auto-update JSON on boot**, standardmaessig aktiviert).  
* Sowohl `/data/adb/COPG-VD.json` als auch `/data/adb/modules/COPG-VD/COPG-VD.json` werden aktualisiert, wenn beide vorhanden sind, und der vorherige Inhalt wird als `.bak` aufbewahrt.  
* Nur die Build-Felder werden neu geschrieben (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Alles andere, das du angepasst hast, bleibt erhalten: zusaetzliche Schluessel, `BOOTLOADER`/`BOARD`/`HARDWARE`, andere Objekte, Schluesselreihenfolge und Formatierung.  
* Es geht niemals rueckwaerts: ein Upstream-Build, der aelter ist als der installierte, wird abgelehnt. Das ist
  normal (das Repo kann hinter einer Konfiguration liegen, die du von Hand aktualisiert hast) und es ist auch der Schutz, der
  auf Android am wichtigsten ist, wo der einzige verfuegbare Downloader busybox `wget` ist, das keine
  TLS-Zertifikate pruefen kann - aus demselben Grund wird jeder Wert vor der Verwendung validiert.  
* Wenn dein Profil **ein anderes Geraet** spoofst (abweichende `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), wird nichts angewendet - ein Pixel-Fingerprint auf einem anderen Profil ist schlimmer als ein alter Fingerprint.  
* Beim Boot laeuft es im Hintergrund und versucht es etwa 10 Minuten lang immer wieder, weil WLAN meist noch nicht verfuegbar ist, wenn der Boot abgeschlossen ist. Es verzoegert den Boot niemals.  
* `resetprop` wird direkt nach einem Update erneut angewendet, aber `android.os.Build` wird vom Zygisk-Modul geschrieben, wenn Zygote startet: **reboote**, damit die neuen Werte die Apps erreichen.  
* Log unter `/data/adb/COPG-VD.update.log`.  
### Android-Version - und warum sie nicht gespooft wird  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` und `CODENAME` beschreiben **deine ROM**, nicht das gespoofte Geraet. Apps vorzugaukeln, das SDK sei neuer als das Framework tatsaechlich ist, bringt sie dazu, APIs aufzurufen, die nicht existieren: Googles Apps stuerzen ab, das Telefon rebootet und faengt von vorn an. Der Boot selbst wird abgeschlossen, daher ist es ein **Softloop** und in den Boot-Logs taucht nichts auf.  
* Sie stehen nicht in der ausgelieferten Konfiguration und der Updater schreibt sie nie.  
* **Spoof Android version** in der WebUI entscheidet, ob sie ueberhaupt angewendet werden:  
  * **Never** (Standard) - die eigene Version der ROM wird verwendet.  
  * **Up to this ROM** - nur das, was sie nicht ueberschreitet, was in der Praxis bedeutet, das SDK abzusenken.  
  * **Force** - genau das, was die Konfiguration sagt. Das ist es, was den Softloop verursacht.  
* Die echte Version wird aus `/system/build.prop` gelesen, niemals aus `getprop` - genau das ist es, was dieses Modul faelscht.  
### Analyze  
**Analyze** in der WebUI (oder `fingerprint-update.sh analyze`) prueft die Konfiguration im aktuellen Zustand: Version gegen die ROM, ob die Datei ueberhaupt noch geparst werden kann (eine kaputte bewirkt, dass das Modul **nichts** spooft, und nur logcat sagt es), ob der Fingerprint zu den umgebenden Feldern passt, Schluessel, die das Modul nicht liest, Datumsangaben und ob die Props bereits das enthalten, was die Konfiguration verlangt.  
### Einstellungen in der Konfiguration  
`COPG-VD.json` kann ein `COPG-VD-Settings`-Objekt enthalten - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - damit deine Entscheidungen mit einem Backup reisen und von Hand bearbeitet werden koennen. Die WebUI schreibt sowohl dieses als auch die Flag-Dateien, die die Boot-Skripte lesen. `"spoof_version": "force"` wird aus der Datei abgelehnt und heruntergestuft: das Wiederherstellen eines alten Backups darf es nicht hinter deinem Ruecken erneut scharfschalten.  
### WebUI  
Die Nutzung der WebUI ist nicht noetig, wenn du die JSON-Konfigurationsdatei direkt bearbeitest.  
Wenn du Magisk-Nutzer bist, verwende KsuWebUI von KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Deaktiviere die resetprop-Nutzung und aktiviere nur das Spoofing der Build-Infos.  
#### Use ro.product.manufacturer:  
Deaktiviere es, wenn dir die Erkennung "Found device spoofing" in der Root-Detector-App Disclosure wichtig ist.  

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
