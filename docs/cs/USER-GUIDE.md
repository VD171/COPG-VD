> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · Čeština · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Uživatelská příručka

COPG-VD přepisuje otisk zařízení a build tak, aby aplikace, které zvolíte, viděly Pixel
místo vašeho skutečného zařízení. Tato příručka vás provede od instalace po funkční
nastavení a volbami po cestě. Pro každé pole a hodnotu viz [CONFIGURATION.md](CONFIGURATION.md);
jak to funguje uvnitř, viz [ARCHITECTURE.md](ARCHITECTURE.md).

## Instalace

1. Nahrajte zip v KernelSU, APatch nebo Magisk a restartujte.
2. Zygisk musí být aktivní (vestavěný, nebo ReZygisk / Zygisk Next). Uživatelé Magisku: zapněte Zygisk.
3. Modul přichází s profilem Pixelu, takže hned po restartu vidí stack Google Play už
   tento Pixel. S funkčním otiskem nepotřebujete PlayIntegrityFix ani
   GooglePhotosUnlimited.

Otevřete WebUI ze svého root manageru pro ovládání modulu. Uživatelé Magisku ji otevřou
pomocí [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Vše
lze také upravovat přímo v `/data/adb/COPG-VD/COPG-VD.json`.

## Kdo vidí spoof (rozsah)

`scope_mode` rozhoduje, které procesy obdrží podvrženou identitu. V rozsahovém režimu je
identita doručena per proces pomocí Zygisku a **není** uniknuta zbytku systému přes
globální vlastnosti.

| Režim | Kdo dostane spoof |
|---|---|
| `playstore` (výchozí) | Pouze stack Play: Google Play services, jeho nestabilní proces a Play Store. |
| `global` | Celé zařízení: každý proces. |
| `whitelist` | Pouze aplikace uvedené v `scope_whitelist`. |
| `blacklist` | Každá aplikace kromě těch v `scope_blacklist`. |

Začněte s `playstore`. Je to nejlehčí volba a ta, která projde Play Integrity, aniž by
spoof vystavovala nesouvisejícím aplikacím.

## Enginy

Každý engine je nezávislý a lze jej vypnout. Všechny jsou ve výchozím stavu zapnuté kromě DRM.

- **Pole Build (`motor_jni`)** - přepisuje `android.os.Build.*` v cílených procesech. To je
  to, co čte většina aplikací.
- **Hook vlastností (`motor_prop_hook`)** - předkládá cíleným procesům podvržené systémové
  vlastnosti, pomocí clean-room přemapování oblasti vlastností per proces (žádný hook
  funkce).
- **resetprop** - přepisuje systémové vlastnosti napříč zařízením, po skupinách (identita,
  verze, stav bootu, SELinux, adb/usb, anti-emulátor a čisticí průchod). V rozsahovém
  režimu zůstávají skupiny identity a verze mimo průchod napříč zařízením (Zygisk je
  doručuje per proces); skupiny bootu, zámku a SELinuxu zůstávají globální. Přepněte jej
  v `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, ve výchozím stavu vypnuto)** - hlásí zvolenou
  bezpečnostní úroveň Widevine (L1 nebo L3) aplikacím, které ji čtou. Viz sekce DRM níže.

## Udržování otisku čerstvého

Otisk stárne: Google rotuje tovární obrazy a starý pomalu ztrácí hodnotu.
`fingerprint-update.sh` udržuje ten váš aktuální, z nejnovějšího továrního obrazu Google.

- Z WebUI (záložka Tools): **Check Update** a **Update Now**.
- Samo o sobě, **jednou za boot**: **Auto-update JSON on boot** (ve výchozím stavu
  zapnuto). Běží na pozadí, zkouší to znovu po dobu asi deseti minut, protože wifi při
  bootu obvykle ještě není nahoře, a nikdy boot nezdržuje.
- Přepisuje pouze pole build (fingerprint, ID, incremental, timestamp, bezpečnostní záplata,
  SDK, UUID, host, user). Vše, co jste si přizpůsobili, je zachováno a předchozí obsah je
  uložen jako `.bak`.
- Nikdy nejde zpět (starší upstream build je odmítnut), a pokud váš profil podvrhuje jiné
  zařízení, neaplikuje nic - otisk Pixelu na jiném profilu je horší než starý.
- `resetprop` je znovu aplikován hned po aktualizaci, ale `android.os.Build` se zapisuje
  při startu zygote, takže **restartujte**, aby nové hodnoty dorazily k aplikacím. Log:
  `/data/adb/COPG-VD/update.log`.

## Past na verzi Androidu

Nejtěžší věc, kterou je třeba udělat správně. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` a
`CODENAME` popisují **vaši ROM**, ne zařízení, které podvrhujete. Říct aplikacím, že SDK
je novější, než framework ve skutečnosti je, je přiměje volat API, která neexistují:
aplikace Google spadnou, telefon se restartuje a začne znovu. Samotný boot se dokončí,
takže je to **softloop**, který nic nezanechá v boot logách.

Tato pole nejsou v dodávané konfiguraci a updater je nikdy nezapisuje. **Spoof Android
version** (`COPG-VD-Settings.spoof_version`) rozhoduje, zda se vůbec aplikují:

- `never` (výchozí) - použije se vlastní verze ROM.
- `rom` - aplikuj pouze to, co nepřekračuje ROM, což v praxi znamená snížení SDK.
- `force` - aplikuj přesně to, co říká konfigurace. To je to, co způsobuje softloop;
  použijte jej pouze, pokud víte, že cílový framework jej podporuje.

Skutečná verze se čte z `/system/build.prop`, nikdy z `getprop` (což je právě to, co
tento modul falšuje). `force` je také odmítnut při obnově zálohy, takže stará záloha jej
nemůže znovu natáhnout za vašimi zády.

## DRM / Widevine

Ve výchozím stavu vypnuto (`motor_drm`). Když je zapnuto, hlásí zvolenou úroveň Widevine,
`DRM_SECURITY_LEVEL` (`L1` nebo `L3`), aplikacím, které ji čtou.

Ve výchozím stavu DRM spoof následuje `scope_mode`. Chcete-li jej místo toho aplikovat na
konkrétní sadu aplikací - nezávisle na hlavním rozsahu - uveďte je v `drm_targets`. Modul
pak zůstává v uvedené aplikaci načten **pouze** kvůli DRM hooku, i když je tato aplikace
mimo hlavní rozsah; prázdný nebo chybějící seznam znamená následovat rozsah. To vyžaduje
rozsahový režim (ne `global`) a projeví se při příštím **restartu**.

## Analyze: zkontrolujte svou konfiguraci

**Analyze** ve WebUI (nebo `fingerprint-update.sh analyze`) prověří konfiguraci v
aktuálním stavu a řekne vám, co je špatně, dříve než to udělá aplikace:

- verzi proti ROM (způsobila by softloop?),
- zda se soubor stále parsuje (poškozený přiměje modul podvrhnout **nic**, a řekl by to
  pouze logcat),
- zda otisk souhlasí s poli kolem sebe,
- klíče, které modul nečte, podezřelá data a zda živé vlastnosti už nesou to, co
  konfigurace žádá.

Spusťte jej, kdykoli konfiguraci upravíte ručně.

## WebUI

Volitelné, ale snadný způsob, jak vše ovládat. Pět záložek:

- **About** - informace o modulu a verzi.
- **Device** - každé pole build, nastavené per stav a seskupené podle kategorie.
- **Spoofing** - režim rozsahu a přepínače enginů.
- **System** - skupiny resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, automatická aktualizace
  při bootu a report Diagnostics (jedno tlačítko pro přečtení a export všeho užitečného
  pro hlášení chyby).

Nedělá žádný síťový požadavek; vše, co potřebuje, přichází uvnitř modulu.

## Řešení potíží

- **Aplikace stále vidí skutečné zařízení.** Zkontrolujte rozsah: v `playstore` je pokryt
  pouze stack Play. Potvrďte, že se konfigurace parsuje (spusťte Analyze). Po změně enginů,
  `drm_targets` nebo profilu **restartujte** - Zygisk čte rozsah při startu zygote.
- **Play Integrity stále selhává.** Ujistěte se, že otisk je čerstvý (Check Update) a že
  `SECURITY_PATCH` je v `global_fields`, aby zůstal koherentní napříč zařízením. Ukončete
  Google Play services, aby znovu provedly atestaci.
- **Telefon se po zapnutí spoofu verze dostane do softloopu.** To je past na verzi
  Androidu výše - nastavte `spoof_version` zpět na `never`.
- **WebUI se na Magisku neotevře.** Použijte [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je udržována VD171. Opravy a vylepšení jsou vítány - viz [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Tato dokumentace byla vytvořena pomocí Claude (Anthropic) a spravuje ji VD171. Opravy a vylepšení jsou vítány; viz [CONTRIBUTING.md](CONTRIBUTING.md)._
