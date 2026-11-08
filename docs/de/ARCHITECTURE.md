> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · Deutsch · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architektur

COPG-VD ist ein Zygisk-Modul: eine kleine native Bibliothek (`libspoof.so`), die der Zygisk-Loader
in Zygote und von dort in App-Prozesse injiziert. Alles, was es tut, ist, den Prozessen, die Sie
anvisieren, eine gewählte Geräteidentität zu präsentieren. Es gibt keine App und, abgesehen vom
optionalen Profilabruf, kein Netzwerk.

## Lebenszyklus

1. **Zygote-Start.** Wenn Zygote bootet, ruft der Loader das `onLoad` des Moduls auf. Es
   liest `/data/adb/COPG-VD.json` einmal: die Geltungsbereichskonfiguration und das Profil.
2. **App-Fork.** Für jede App, die Zygote forkt, entscheidet das Modul in
   `preAppSpecialize`, ob dieser Prozess im Geltungsbereich ist:
   - **im Haupt-Geltungsbereich** (`playstore` / `global` / `whitelist` / `blacklist`), oder
   - **im DRM-Geltungsbereich** (in `drm_targets` aufgeführt).
   Ist er in keinem von beiden, **löst sich** das Modul von diesem Prozess (`dlclose`) und hinterlässt keine
   Spur darin.
3. **Specialize.** Für einen Prozess, der bleibt, werden die Engines in `postAppSpecialize` angewendet,
   solange der Prozess noch privilegiert ist.

Weil Forks die Speicherkopie von Zygote per Copy-on-Write erben, startet jede App von der beim Boot
gelesenen Konfiguration. Das Modul liest die Datei pro anvisiertem Prozess nur dann erneut, wenn sie sich
tatsächlich geändert hat, sodass eine neu gestartete oder wieder geöffnete App ein bearbeitetes Profil aufgreift - aber
die Geltungsbereichsentscheidung selbst wird beim Start von Zygote getroffen, sodass **das Ändern des Geltungsbereichs, der Engines oder von
`drm_targets` einen Neustart erfordert**.

## Die Engines

Jede ist unabhängig und schaltbar.

- **Build-Felder (`motor_jni`).** Schreibt `android.os.Build.*` (und `Build.VERSION.*`)
  im anvisierten Prozess über JNI um, sodass Java-Code die gespooften Werte liest.
- **Property-Hook (`motor_prop_hook`).** Präsentiert dem Prozess die gespooften Systemeigenschaften
  über ein Clean-Room-Remapping des Eigenschaftsbereichs pro Prozess (`prop_virtualizer`).
  Es ist ein Speicher-Remapping, kein Funktions-Hook, sodass es keinen Fußabdruck einer gehookten Funktion gibt.
- **resetprop (geräteweit).** Schreibt Systemeigenschaften nach Gruppe - Identität,
  Version, Boot-State, SELinux, adb/usb, Anti-Emulator, plus ein Bereinigungsdurchlauf. Die Boot-Skripte führen
  es aus. In einem bereichsbezogenen Modus werden die Gruppen Identität und Version weggelassen (Zygisk liefert sie
  prozessweise); die Gruppen Boot, Lock und SELinux bleiben global, damit das Gerät kohärent ist.
- **DRM / Widevine (`motor_drm`).** Hookt die `MediaDrm`-Methoden, die die Widevine-Sicherheitsstufe
  melden (`getSecurityLevel`, `getPropertyString`), und gibt die konfigurierte
  Stufe zurück. Die Hooks sind null-geprüft, sodass ein fehlerhaftes Profil anmutig degradiert, statt die App
  zum Absturz zu bringen. `drm_targets` lässt diese Engine auf ihrer eigenen App-Liste laufen, entkoppelt vom
  Haupt-Geltungsbereich.

## Lesen der Konfiguration

Der injizierte Prozess läuft in der SELinux-Domäne von Zygote, die standardmäßig nicht auf
`/data/adb` zugreifen kann. Das Modul liefert seine eigene `sepolicy.rule` mit, um das zu erlauben, und kann als
Fallback die Konfiguration über sein offenes Modulverzeichnis (`getModuleDir`) lesen, sodass es weiter
funktioniert, selbst wenn ein Zygisk-Build den Pfad nicht mehr gewährt. Die Datei wird mit einem kleinen
eingebetteten JSON-Parser (`jsmn`) geparst; eine Datei, die nicht parst, bedeutet, dass das Modul nichts spooft.

## Das Profil aktuell halten

`fingerprint-update.sh` aktualisiert die Build-Felder vom neuesten Google-Factory-Image,
über die WebUI oder einmal pro Boot. Es verwendet den eigenen gebündelten Downloader des Moduls (kein `PATH`-
`curl`/`wget`), validiert jeden Wert vor der Verwendung, geht nie rückwärts und lehnt ein
Profil ab, das ein anderes Gerät spooft. `android.os.Build` wird beim Zygote-Start geschrieben, sodass
neue Werte die Apps beim nächsten Neustart erreichen. Siehe [USER-GUIDE.md](USER-GUIDE.md) für die Benutzerseite
und [CONFIGURATION.md](CONFIGURATION.md) für die Felder.

## Warum die Android-Version standardmäßig nicht gespooft wird

`SDK_INT` / `ANDROID_VERSION` über das anzuheben, was das Framework der ROM wirklich ist, bringt Apps dazu,
APIs aufzurufen, die nicht existieren, was Googles Apps abstürzen lässt und das Telefon in einen
Softloop neu startet. Die Versionsgruppe ist daher standardmäßig aus und hinter
`spoof_version` abgesichert. Das Modul liest die echte Version aus `/system/build.prop`, nie aus
`getprop`, weil `getprop` genau das ist, was es fälscht. Siehe die Falle in
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen - siehe [../CONTRIBUTING.md](CONTRIBUTING.md).*
