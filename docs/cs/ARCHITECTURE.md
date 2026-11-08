> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · Čeština · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architektura

COPG-VD je modul Zygisk: malá nativní knihovna (`libspoof.so`), kterou loader Zygisku
injektuje do zygote a odtud do procesů aplikací. Vše, co dělá, je předložit zvolenou
identitu zařízení procesům, které cílíte. Neexistuje žádná aplikace a kromě volitelného
stažení profilu žádná síť.

## Životní cyklus

1. **Start zygote.** Když zygote nabootuje, loader volá modulovou funkci `onLoad`. Jednou
   přečte `/data/adb/COPG-VD.json`: konfiguraci rozsahu a profil.
2. **Fork aplikace.** Pro každou aplikaci, kterou zygote forkne, modul v `preAppSpecialize`
   rozhodne, zda je tento proces v rozsahu:
   - **v hlavním rozsahu** (`playstore` / `global` / `whitelist` / `blacklist`), nebo
   - **v DRM rozsahu** (uveden v `drm_targets`).
   Pokud není ani jedno, modul se od tohoto procesu **odpojí** (`dlclose`) a nezanechá v
   něm žádnou stopu.
3. **Specialize.** U procesu, který zůstává, se enginy aplikují v `postAppSpecialize`,
   zatímco je proces stále privilegovaný.

Protože forky dědí copy-on-write kopii paměti zygote, každá aplikace startuje z
konfigurace přečtené při bootu. Modul čte soubor znovu per cílený proces pouze tehdy, když
se skutečně změnil, takže nově spuštěná nebo znovu otevřená aplikace zachytí upravený
profil - ale samotné rozhodnutí o rozsahu se dělá při startu zygote, takže **změna
rozsahu, enginů nebo `drm_targets` vyžaduje restart**.

## Enginy

Každý je nezávislý a přepínatelný.

- **Pole Build (`motor_jni`).** Přepisuje `android.os.Build.*` (a `Build.VERSION.*`) v
  cíleném procesu přes JNI, takže Java kód čte podvržené hodnoty.
- **Hook vlastností (`motor_prop_hook`).** Předkládá procesu podvržené systémové vlastnosti
  pomocí clean-room přemapování oblasti vlastností per proces (`prop_virtualizer`). Je to
  přemapování paměti, ne hook funkce, takže neexistuje stopa po hooknuté funkci.
- **resetprop (napříč zařízením).** Zapisuje systémové vlastnosti po skupinách - identita,
  verze, stav bootu, SELinux, adb/usb, anti-emulátor, plus čisticí průchod. Spouštějí jej
  boot skripty. V rozsahovém režimu jsou skupiny identity a verze vynechány (Zygisk je
  doručuje per proces); skupiny bootu, zámku a SELinuxu zůstávají globální, aby bylo
  zařízení koherentní.
- **DRM / Widevine (`motor_drm`).** Hookuje metody `MediaDrm`, které hlásí bezpečnostní
  úroveň Widevine (`getSecurityLevel`, `getPropertyString`), a vrací nakonfigurovanou
  úroveň. Hooky mají kontrolu na null, takže poškozený profil elegantně degraduje místo
  pádu aplikace. `drm_targets` umožňuje tomuto enginu běžet na vlastním seznamu aplikací,
  odpojeně od hlavního rozsahu.

## Čtení konfigurace

Injektovaný proces běží v SELinux doméně zygote, která ve výchozím stavu nemůže dosáhnout
na `/data/adb`. Modul přichází s vlastním `sepolicy.rule`, aby to umožnil, a jako záloha
může číst konfiguraci přes svůj otevřený adresář modulu (`getModuleDir`), takže funguje
dál, i kdyby build Zygisku přestal udělovat cestu. Soubor je parsován malým vestavěným JSON
parserem (`jsmn`); soubor, který se neparsuje, znamená, že modul nic nepodvrhuje.

## Udržování profilu čerstvého

`fingerprint-update.sh` obnovuje pole build z nejnovějšího továrního obrazu Google, z WebUI
nebo jednou za boot. Používá vlastní přibalený downloader modulu (ne `curl`/`wget` z
`PATH`), validuje každou hodnotu před použitím, nikdy nejde zpět a odmítá profil, který
podvrhuje jiné zařízení. `android.os.Build` se zapisuje při startu zygote, takže nové
hodnoty dorazí k aplikacím při příštím restartu. Viz [USER-GUIDE.md](USER-GUIDE.md) pro
uživatelskou stranu a [CONFIGURATION.md](CONFIGURATION.md) pro pole.

## Proč se verze Androidu ve výchozím stavu nepodvrhuje

Zvýšení `SDK_INT` / `ANDROID_VERSION` nad to, co framework ROM ve skutečnosti je, přiměje
aplikace volat API, která neexistují, což shodí aplikace Google a restartuje telefon do
softloopu. Skupina verze je proto ve výchozím stavu vypnuta a uzamčena za `spoof_version`.
Modul čte skutečnou verzi z `/system/build.prop`, nikdy z `getprop`, protože `getprop` je
přesně to, co falšuje. Viz past v [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je udržována VD171. Opravy a vylepšení jsou vítány - viz [../CONTRIBUTING.md](CONTRIBUTING.md).*
