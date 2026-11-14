<!--
  COPG-VD: global device spoofer: spoof your device fingerprint and build.
  Copyright (C) 2026  AlirezaParsi & VD171. SPDX-License-Identifier: Apache-2.0 (Fork by VD171)
-->

# COPG-VD

<p align="center">
  <img src="images/logo-wordmark.png" alt="COPG-VD" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/COPG-VD?label=release&color=2ee89d" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/COPG-VD/releases"><img src="https://img.shields.io/github/downloads/VD171/COPG-VD/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/COPG-VD/stargazers"><img src="https://img.shields.io/github/stars/VD171/COPG-VD?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>COPG-VD je spoofer zařízení: přepisuje fingerprint a build zařízení tak, aby aplikace viděly zařízení, které si zvolíš, místo toho skutečného.</b><br>
  Běží na Zygisku (KernelSU, APatch nebo Magisk) a ve výchozím nastavení omezuje spoofing na stack Google Play: takže je lehčí a robustnější alternativou k PlayIntegrityFix.
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases">Releases</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/cs-Home">Wiki</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/cs-USER-GUIDE">Uživatelská příručka</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/cs-CONFIGURATION">Referenční příručka konfigurace</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/cs-ARCHITECTURE">Architektura</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/cs-FILE-STRUCTURE">Struktura souborů</a> ·
  <a href="https://xdaforums.com/t/COPG-VD.4807698/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

---

## Jak se používá?
Nainstaluj modul, restartuj, a dodávaný profil (Pixel) se spoofuje cílovým aplikacím. S funkčním fingerprintem nepotřebuješ PlayIntegrityFix ani GooglePhotosUnlimited.  
Vše se konfiguruje v `/data/adb/COPG-VD/COPG-VD.json` nebo z WebUI. Všechna pole jsou VOLITELNÁ: pole, které není uvedeno, se přeskočí.  

### Scope: kdo spoofing vidí
`scope_mode` rozhoduje, které procesy dostanou spoofovanou identitu. V omezeném režimu dodává identitu Zygisk pro každý proces zvlášť a neuniká do zbytku systému přes globální properties.  
* **Google Play** (`playstore`, výchozí): pouze stack Play (Google Play services, jeho unstable proces a Play Store).  
* **Global**: celé zařízení; vidí ji každý proces.  
* **Whitelist**: pouze aplikace v `scope_whitelist`.  
* **Blacklist**: každá aplikace kromě těch v `scope_blacklist`.  

### Engines: jak se spoofing dodává
Každý je nezávislý a lze jej vypnout:  
* **Build fields (JNI)**: přepisuje `android.os.Build.*` v cílových procesech.  
* **Property hook**: předkládá cílovým procesům spoofované systémové properties (čisté přemapování oblasti properties pro každý proces zvlášť, bez hooku funkce).  
* **resetprop**: přepisuje systémové properties, spravované po skupinách: identita, verze, stav bootu, SELinux, adb/usb, anti-emulátor a úklidový průchod. V omezeném režimu zůstávají skupiny identity a verze mimo celozařízový resetprop (Zygisk je dodává pro každý proces); skupiny boot/lock/SELinux zůstávají globální.  
* **DRM / Widevine** (ve výchozím nastavení vypnuto): hlásí aplikacím, které jej čtou, zvolenou úroveň zabezpečení Widevine, L1 nebo L3. Ve výchozím nastavení následuje rozsah výše; nastav `drm_targets` (seznam aplikací), aby se DRM spoofing použil pouze na tyto aplikace, nezávisle na `scope_mode`: modul zůstává načtený v uvedené aplikaci jen kvůli DRM hooku, i když je ta aplikace mimo hlavní rozsah. Prázdné nebo chybějící znamená následovat rozsah. (Vyžaduje režim s rozsahem, ne Global.)  

### Fields: nastavit, vyprázdnit, smazat nebo přeskočit
Uvnitř objektu `COPG-VD` má každé pole Build čtyři stavy:  
* **Set**: `"KEY": "value"` zapíše hodnotu.  
* **Empty**: `"KEY": ""` zapíše prázdnou hodnotu.  
* **Delete**: uveď klíč v `"COPG-VD-Delete": [ ... ]` na nejvyšší úrovni, aby se odstranil (pole Build se změní na null, property se odstraní pomocí `resetprop --delete`).  
* **Skip**: klíč zcela vynech; zachová se vlastní hodnota ROM.  

Seznam `"global_fields": [ ... ]` aplikuje uvedená pole Build na celé zařízení i v omezeném režimu, aby hodnota byla všude konzistentní: pouze pro pole bezpečná z hlediska koherence (například security patch), nikdy identitu a nikdy skupinu verze Androidu.  

### Příklad konfiguračního souboru JSON
`/data/adb/COPG-VD/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.261016.008-factory-28d56d15.zip",
  "scope_mode": "playstore",
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": [],
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.261016.008",
    "ID": "ZP11.261016.008",
    "HOST": "e4df75f83a59",
    "INCREMENTAL": "16754936",
    "TIMESTAMP": "1793211232",
    "PREVIEW_SDK": "20261104",
    "USER": "android-build",
    "SDK_FINGERPRINT": "ee82a872870173d77e68050e21a2bcbf",
    "UUID": "FjWvtSORkI0sEwekaPz2s30gqV5vWP_EZHFtBiXzboc",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  }
}
```
Dbej na to, abys používal řetězce pouze v dvojitých uvozovkách.  
Blok výše a `module/COPG-VD.json.example` jsou denně aktualizovány workflow [Update COPG-VD.json](.github/workflows/update-json.yml), přímo z nejnovějšího továrního image Google.  

### Udržování fingerprintu aktuálního
`fingerprint-update.sh` stáhne tento soubor a aktualizuje tvou konfiguraci, z WebUI (**Check Update** / **Update Now**) nebo sám od sebe **jednou za boot** (**Auto-update JSON on boot**, ve výchozím stavu zapnuto).  
* `/data/adb/COPG-VD/COPG-VD.json` se aktualizuje na místě a předchozí obsah se uchová vedle něj jako `COPG-VD.json.bak`.  
* Přepisují se pouze pole build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Vše ostatní, co sis přizpůsobil, se zachová: další klíče, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, jiné objekty, pořadí klíčů a formátování.  
* Nikdy nejde zpět: upstream build starší než nainstalovaný je odmítnut. To je
  běžné (repo může zaostávat za konfigurací, kterou jsi aktualizoval ručně) a je to také ochrana, na které
  na Androidu nejvíc záleží, kde jediný dostupný stahovač je busybox `wget`, který neumí
  ověřit TLS certifikáty: ze stejného důvodu je každá hodnota před použitím ověřena.  
* Pokud tvůj profil spoofuje **jiné zařízení** (odlišné `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), nic se neaplikuje: fingerprint Pixelu v jiném profilu je horší než starý fingerprint.  
* Při bootu běží na pozadí a zkouší to znovu po dobu ~10 minut, protože wifi obvykle ještě nenaběhla, když boot skončí. Boot nikdy nezdržuje.  
* `resetprop` se znovu aplikuje hned po aktualizaci, ale `android.os.Build` zapisuje zygisk modul při startu zygoty: **restartuj**, aby nové hodnoty dorazily k aplikacím.  
* Log v `/data/adb/COPG-VD/update.log`.  

### Verze Androidu: a proč se nespoofuje
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` a `CODENAME` popisují **tvou ROM**, nikoli spoofované zařízení. Tvrdit aplikacím, že SDK je novější, než je framework ve skutečnosti, je přiměje volat API, která neexistují: aplikace Google spadnou, telefon se restartuje a začne znovu. Samotný boot se dokončí, takže jde o **softloop** a v boot logách se nic neobjeví.  
* Nejsou v dodávané konfiguraci a aktualizátor je nikdy nezapisuje.  
* **Spoof Android version** ve WebUI rozhoduje, zda se vůbec aplikují:  
  * **Never** (výchozí): použije se vlastní verze ROM.  
  * **Up to this ROM**: jen to, co ji nepřekročí, což v praxi znamená snížení SDK.  
  * **Force**: přesně to, co říká konfigurace. To je to, co způsobuje softloop.  
* Skutečná verze se čte z `/system/build.prop`, nikdy z `getprop`: což je právě to, co tento modul falšuje.  

### Analyze
**Analyze** ve WebUI (nebo `fingerprint-update.sh analyze`) prověří konfiguraci v aktuálním stavu: verzi proti ROM, zda se soubor vůbec ještě dá naparsovat (poškozený způsobí, že modul nespoofuje **nic**, a řekne to jen logcat), zda fingerprint souhlasí s poli kolem něj, klíče, které modul nečte, data, a zda props už nesou to, co konfigurace požaduje.  

### WebUI
WebUI je volitelné (vše lze upravovat přímo v JSON konfiguraci) ale je to snadný způsob, jak modul ovládat. Má pět záložek: **About**, **Device** (každé pole, nastavené po stavech, seskupené podle kategorie), **Spoofing** (scope a engines), **System** (skupiny resetprop) a **Tools** (Analyze, Check Update, Update Now, Backup/Restore a auto-update při bootu). Neposílá žádný síťový požadavek; vše, co potřebuje, je součástí modulu.  
Pokud jsi uživatel Magisku, použij KsuWebUI od KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases). Můžeš také použít WebUI-X Portable od MMRL (https://github.com/MMRLApp/WebUI-X-Portable/releases).  

### Nastavení v konfiguraci
`COPG-VD.json` nese svá nastavení hned vedle profilu, takže tvá rozhodnutí cestují se zálohou a dají se upravovat ručně: `scope_mode`, přepínače engines, skupiny resetprop, `global_fields` a objekt `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_version`). Vše je v tomto jediném souboru: boot skripty i WebUI čtou nastavení přímo z něj, takže tvá rozhodnutí přežijí aktualizaci modulu. `"spoof_version": "force"` je ze souboru odmítnut a snížen: obnovení staré zálohy ho nesmí za tvými zády znovu aktivovat.  

<!-- vd-docs -->
## Dokumentace

- **[Wiki](https://github.com/VD171/COPG-VD/wiki/cs-Home)**: kompletní dokumentace, k prohlížení online.
- **[Uživatelská příručka](https://github.com/VD171/COPG-VD/wiki/cs-USER-GUIDE)**: instalace, WebUI a každodenní používání.
- **[Referenční příručka konfigurace](https://github.com/VD171/COPG-VD/wiki/cs-CONFIGURATION)**: každé nastavení v konfiguračním souboru a co dělá.
- **[Architektura](https://github.com/VD171/COPG-VD/wiki/cs-ARCHITECTURE)** a **[Struktura souborů](https://github.com/VD171/COPG-VD/wiki/cs-FILE-STRUCTURE)**: jak spoofing funguje a kde všechno najdete.

<!-- /vd-docs -->

## Viz také

Sourozenecké projekty od stejného autora:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: debugger metod zařízení, který čte každou položku přes každou metodu, která ji umí přečíst, a porovnává je vedle sebe.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: tvé služby Google (RCS, Wallet, atestace Play Integrity), čtené na tvém zařízení bez internetu.
- **[VDBackup](https://github.com/VD171/VD-Backup)**: kompletní záloha a obnova aplikací a dat jako root, ovládaná výhradně z WebUI.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: samostatný rootovaný SSH démon (Dropbear).

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork od @T3SL4).

## Kontakty

- https://vd171.ru
- https://vd.priv8.ru
- *Telegram:* @VD_Priv8 https://t.me/VD_Priv8
- *Channel:* @Priv8_VD https://t.me/Priv8_VD
- *Discord:* @VD.Priv8 https://discord.com/users/1296831918989639721
- *E-mail:* vd.priv8@pm.me
- *XDA-Developers:* @VD171 https://xdaforums.com/m/vd171.4699873/
- *XDA thread:* https://xdaforums.com/t/COPG-VD.4807698/
- *GitHub:* @VD171 https://github.com/VD171

## Licence

**Apache-2.0**: viz [LICENSE](LICENSE). COPG-VD je fork od VD171 původního COPG od AlirezaParsi, pokračující pod stejnou licencí.

## Ochranné známky

COPG-VD je nezávislý, neoficiální projekt. Není spojen s Google LLC, ani jí podporován či sponzorován. „Google", „Google Play", „Play Integrity", „Pixel", „Android" a související názvy a loga jsou ochranné známky společnosti Google LLC. COPG-VD běží výhradně na tvém zařízení.

## Štítky

`Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
