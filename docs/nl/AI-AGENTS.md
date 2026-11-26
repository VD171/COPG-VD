> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · Nederlands · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI-agents: het bedieningsoppervlak

COPG-VD verwelkomt AI- en agentbijdragers, en de hele module is gebouwd om headless te worden aangestuurd,
zonder de WebUI te scrapen. Er zijn twee oppervlakken, en een agent die als root draait (zoals de WebUI doet)
gebruikt ze allebei:

1. **Het configuratiebestand** `/data/adb/COPG-VD/COPG-VD.json` - de enige bron van waarheid. Elk
   profielveld en elke instelling woont hier, dit bestand lezen en schrijven is hoe je verandert wat de
   module vervalst.
2. **Het shell-startpunt** `fingerprint-update.sh` - een enkel script met stabiele werkwoorden voor het
   controleren, toepassen en ophalen van profielen.

## Het configuratiebestand

`/data/adb/COPG-VD/COPG-VD.json` is een gewoon JSON-object. De module leest het vanuit de geinjecteerde
processen via een eigen SELinux-regel die het zelf meelevert, het bevat geen inloggegevens. Een meegeleverd
voorbeeld staat in `module/COPG-VD.json.example`, dagelijks vernieuwd vanuit de nieuwste fabrieksimage van
Google.

Regels die een agent moet volgen:

- **Strings gebruiken alleen dubbele aanhalingstekens**, zoals in JSON.
- **Elk veld is optioneel.** Een veld dat niet wordt opgegeven, wordt overgeslagen en de eigen waarde van de
  ROM blijft behouden.
- De sleutels op het hoogste niveau die de module sturen zijn `scope_mode`, `scope_whitelist`,
  `scope_blacklist`, `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, het `COPG-VD`-object
  (de Build-velden), een `COPG-VD-Delete`-lijst en een `COPG-VD-Settings`-object (`resetprop`, `autoupdate`,
  `spoof_version`). De [Configuratiereferentie](CONFIGURATION.md) documenteert ze allemaal.
- `"spoof_version": "force"` wordt geweigerd wanneer het uit het bestand op schijf komt en wordt bij het
  lezen teruggeschaald, zodat het herstellen van een oude back-up het niet stilletjes opnieuw kan activeren.
  Stel het versiebeleid in via de instellingen, niet door `force` met de hand te schrijven.
- Draai na het bewerken van het bestand **`analyze`** (hieronder): een bestand dat niet parseert laat de
  module **niets** vervalsen, en alleen logcat zegt dat.

Een gewijzigde config bereikt apps bij de volgende processtart. Door `resetprop` geleverde eigenschappen
kunnen zonder reboot opnieuw worden toegepast (`service.sh --props-only`), maar de `android.os.Build.*`-velden
worden door de Zygisk-bibliotheek geschreven wanneer zygote start, dus **een reboot is vereist** voordat die
apps bereiken.

## Het shell-contract

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Het script print voor mensen leesbare regels, de door machines leesbare beginnen met `status:`. De exitcode is
`0` bij succes en niet-nul bij een fout.

| Werkwoord | Wat het doet | Typische uitvoer |
|---|---|---|
| `check` | Vergelijkt het geinstalleerde profiel met de nieuwste upstream build, schrijft niets. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Haalt het nieuwste profiel op en voegt het samen met de config (alleen Build-velden, je andere sleutels blijven behouden). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Controleert de config zoals die nu is (parse, versie vs ROM, fingerprint-coherentie, onbekende sleutels, datums, props). Print een rapport, de exitcode weerspiegelt red/warn-bevindingen. | een tekstrapport |
| `fetch-index` | Downloadt en verifieert de ondertekende apparaatindex en print die (`index.json`). | de index-JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Downloadt de `build.prop` van een apparaat (pad uit de index, bv. `pixel-9a/latest.prop`) en schrijft de Build-velden ervan naar de config. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migreert staat/config van de oude platte indeling naar `/data/adb/COPG-VD/`. | - |
| `migrate` | Eenmalige config-migratie tussen moduleversies. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | De automatische update eens per boot, bedoeld voor `service.sh`, niet voor interactief gebruik. | schrijft `update.status` |

Elke download wordt voor gebruik gevalideerd (de enige downloader op het toestel is busybox `wget`, die TLS
niet kan valideren), en de profiel-updater gaat nooit achteruit: een upstream build ouder dan de
geinstalleerde wordt geweigerd. De feedindex en elke `.prop` dragen een losse ed25519-handtekening die wordt
geverifieerd voordat de inhoud wordt gelezen.

## Typische agentstromen

- **Het profiel vers houden:** `check`; als `status: update-available`, `apply`; herstart dan zodat de nieuwe
  `Build.*` apps bereikt.
- **Overschakelen naar een ander Pixel-profiel:** `fetch-index`, kies een apparaatpad uit de index, `fetch
  <path>`, draai `analyze` om te bevestigen dat de config coherent is, en herstart dan.
- **Scope of een engine wijzigen:** bewerk `scope_mode` (of een engine-schakelaar) in het configuratiebestand,
  draai `analyze`, en dan `service.sh --props-only` voor via eigenschappen geleverde wijzigingen, of herstart
  voor Build-velden.

## Veiligheidsgrenzen

- De config wijzigen of een profiel toepassen verandert wat elke beoogde app ziet, bevestig de bedoeling
  voordat je schrijft, zoals de WebUI doet.
- Versoepel nooit een echte coherentiebescherming: de SDK is onder elk beleid afgetopt op het echte framework,
  de manufacturer blijft in de pas met de rest van het profiel, en een profiel voor een ander apparaat wordt
  geweigerd. Dit is bewust en mag niet worden omzeild.
- De config is het ondersteunde oppervlak. Scrape of automatiseer de WebUI zelf niet.

<!-- doc-footer -->

---

> _Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom, zie [CONTRIBUTING.md](CONTRIBUTING.md)._
