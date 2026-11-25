> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · Čeština · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI agenti: ovládací plocha

COPG-VD vítá přispěvatele z řad AI a agentů a celý modul je postaven tak, aby se dal řídit headless, bez
scrapování WebUI. Existují dvě plochy, a agent běžící jako root (jako to dělá WebUI) používá obě:

1. **Konfigurační soubor** `/data/adb/COPG-VD/COPG-VD.json` - jediný zdroj pravdy. Každé pole profilu i
   každé nastavení žije zde; čtení a zápis tohoto souboru je způsob, jak měníš to, co modul spoofuje.
2. **Shell vstupní bod** `fingerprint-update.sh` - jeden skript se stabilními slovesy pro kontrolu,
   aplikaci a stahování profilů.

## Konfigurační soubor

`/data/adb/COPG-VD/COPG-VD.json` je prostý JSON objekt. Modul jej čte z injektovaných procesů přes vlastní
SELinux pravidlo, které sám dodává; neobsahuje žádné přihlašovací údaje. Dodávaný příklad leží v
`module/COPG-VD.json.example` a je denně obnovován z nejnovějšího továrního image Google.

Pravidla, která agent musí dodržovat:

- **Řetězce pouze v dvojitých uvozovkách**, jako v JSON.
- **Každé pole je volitelné.** Pole, které není uvedeno, se přeskočí a zachová se vlastní hodnota ROM.
- Klíče nejvyšší úrovně, které řídí modul, jsou `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, objekt `COPG-VD` (pole Build), seznam
  `COPG-VD-Delete` a objekt `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_version`). [Referenční
  příručka konfigurace](CONFIGURATION.md) dokumentuje každý z nich.
- `"spoof_version": "force"` je odmítnut, když pochází ze souboru na disku, a při čtení je snížen, takže
  obnovení staré zálohy ho nemůže potichu znovu aktivovat. Nastav politiku verze přes nastavení, ne ručním
  zápisem `force`.
- Po úpravě souboru spusť **`analyze`** (níže): soubor, který se nenaparsuje, způsobí, že modul nespoofuje
  **nic**, a řekne to jen logcat.

Změněná konfigurace dorazí k aplikacím při příštím startu procesu. Properties doručené přes `resetprop` lze
znovu aplikovat bez rebootu (`service.sh --props-only`), ale pole `android.os.Build.*` zapisuje knihovna
Zygisk při startu zygoty, takže **je nutný reboot**, aby dorazila k aplikacím.

## Shell kontrakt

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Skript vypisuje řádky čitelné pro člověka; strojově čitelné začínají na `status:`. Jeho návratový kód je
`0` při úspěchu a nenulový při selhání.

| Sloveso | Co dělá | Typický výstup |
|---|---|---|
| `check` | Porovná nainstalovaný profil s nejnovějším upstream buildem, nic nezapisuje. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Stáhne nejnovější profil a sloučí jej do konfigurace (pouze pole build; tvé ostatní klíče zůstanou zachovány). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Prověří konfiguraci v aktuálním stavu (parsování, verze vs. ROM, koherence fingerprintu, neznámé klíče, data, props). Vypíše zprávu; návratový kód odráží červené/varovné nálezy. | textová zpráva |
| `fetch-index` | Stáhne a ověří podepsaný index zařízení a vypíše jej (`index.json`). | JSON indexu \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Stáhne `build.prop` jednoho zařízení (cesta z indexu, např. `pixel-9a/latest.prop`) a zapíše jeho pole build do konfigurace. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Přemigruje stav/konfiguraci ze starého plochého rozložení do `/data/adb/COPG-VD/`. | - |
| `migrate` | Jednorázová migrace konfigurace mezi verzemi modulu. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Automatická aktualizace jednou za boot; určená pro `service.sh`, ne pro interaktivní použití. | zapíše `update.status` |

Každé stažení je před použitím ověřeno (jediný stahovač na zařízení je busybox `wget`, který neumí ověřit
TLS), a aktualizátor profilů nikdy nejde zpět: upstream build starší než nainstalovaný je odmítnut. Index
feedu i každá `.prop` nesou oddělený podpis ed25519, který se ověří dřív, než se obsah přečte.

## Typické postupy agenta

- **Udržet profil čerstvý:** `check`; při `status: update-available` `apply`; pak restartuj, aby nové
  `Build.*` dorazily k aplikacím.
- **Přepnout na jiný profil Pixelu:** `fetch-index`, vyber cestu zařízení z indexu, `fetch <path>`, spusť
  `analyze` pro potvrzení, že je konfigurace koherentní, pak restartuj.
- **Změnit rozsah nebo engine:** uprav `scope_mode` (nebo přepínač enginu) v konfiguračním souboru, spusť
  `analyze`, pak `service.sh --props-only` pro změny doručené přes property, nebo restartuj pro pole Build.

## Bezpečnostní zábradlí

- Změna konfigurace nebo aplikace profilu mění to, co vidí každá cílená aplikace; před zápisem potvrď záměr,
  jako to dělá WebUI.
- Nikdy nepovoluj skutečnou koherenční pojistku: SDK je pod každou politikou zastropováno na skutečný
  framework, výrobce zůstává v souladu se zbytkem profilu a profil pro jiné zařízení je odmítnut. Jsou
  záměrné a nesmí se obcházet.
- Konfigurace je podporovaná plocha. Nescrapuj ani neautomatizuj samotné WebUI.

<!-- doc-footer -->

---

> _Tato dokumentace byla vytvořena pomocí Claude (Anthropic) a spravuje ji VD171. Opravy a vylepšení jsou vítány; viz [CONTRIBUTING.md](CONTRIBUTING.md)._
