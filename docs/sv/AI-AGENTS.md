> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · Svenska · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI-agenter: styrytan

COPG-VD välkomnar AI- och agentbidragsgivare, och hela modulen är byggd för att drivas huvudlöst,
utan att skrapa WebUI. Det finns två ytor, och en agent som körs som root (som WebUI gör) använder
båda:

1. **Konfigurationsfilen** `/data/adb/COPG-VD/COPG-VD.json` - den enda källan till sanning. Varje
   profilfält och varje inställning finns här, att läsa och skriva denna fil är hur du ändrar vad
   modulen spoofar.
2. **Shell-ingångspunkten** `fingerprint-update.sh` - ett skript med stabila verb för att kontrollera,
   tillämpa och hämta profiler.

## Konfigurationsfilen

`/data/adb/COPG-VD/COPG-VD.json` är ett vanligt JSON-objekt. Modulen läser den från de injicerade
processerna via en dedikerad SELinux-regel som den själv levererar, den innehåller inga
autentiseringsuppgifter. Ett medföljande exempel finns i `module/COPG-VD.json.example`, uppdaterat
dagligen från den nyaste Google-factory-avbildningen.

Regler som en agent måste följa:

- **Strängar använder endast dubbla citattecken**, som i JSON.
- **Varje fält är valfritt.** Ett fält som inte anges hoppas över och ROM:ens eget värde behålls.
- Nycklarna på toppnivå som styr modulen är `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, `COPG-VD`-objektet (Build-fälten),
  en `COPG-VD-Delete`-lista och ett `COPG-VD-Settings`-objekt (`resetprop`, `autoupdate`,
  `spoof_version`). [Konfigurationsreferensen](CONFIGURATION.md) dokumenterar var och en.
- `"spoof_version": "force"` avvisas när det kommer från filen på disk och nedgraderas vid läsning,
  så att återställning av en gammal säkerhetskopia inte tyst kan återaktivera det. Ange versionspolicyn
  via inställningarna, inte genom att handskriva `force`.
- Efter att du har redigerat filen, kör **`analyze`** (nedan): en fil som inte parsar gör att modulen
  spoofar **ingenting**, och endast logcat säger det.

En ändrad konfiguration når apparna vid nästa processstart. Egenskaper som levereras med `resetprop`
kan tillämpas på nytt utan omstart (`service.sh --props-only`), men `android.os.Build.*`-fälten skrivs
av Zygisk-biblioteket när zygote startar, så **en omstart krävs** för att de ska nå apparna.

## Shell-kontraktet

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Skriptet skriver ut läsbara rader, maskinläsbara börjar med `status:`. Dess slutkod är `0` vid
framgång och icke-noll vid fel.

| Verb | Vad det gör | Typisk utdata |
|---|---|---|
| `check` | Jämför den installerade profilen mot den nyaste upstream-builden, skriver ingenting. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Hämtar den nyaste profilen och slår samman den i konfigurationen (endast build-fält, dina andra nycklar bevaras). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Granskar konfigurationen som den är (parsning, version mot ROM, fingerprint-koherens, okända nycklar, datum, props). Skriver ut en rapport, slutkoden återspeglar fynd av typen red/warn. | en textrapport |
| `fetch-index` | Laddar ner och verifierar det signerade enhetsindexet och skriver ut det (`index.json`). | index-JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Laddar ner en enhets `build.prop` (sökväg från indexet, t.ex. `pixel-9a/latest.prop`) och skriver dess build-fält till konfigurationen. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migrerar tillstånd/konfiguration från den gamla platta layouten till `/data/adb/COPG-VD/`. | - |
| `migrate` | Engångsmigrering av konfiguration mellan modulversioner. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Den automatiska uppdateringen en gång per boot, avsedd för `service.sh`, inte interaktiv användning. | skriver `update.status` |

Varje nedladdning valideras före användning (den enda nedladdaren på enheten är busybox `wget`, som
inte kan validera TLS), och profiluppdateraren går aldrig bakåt: en upstream-build som är äldre än den
installerade avvisas. Feed-indexet och varje `.prop` bär en fristående ed25519-signatur som verifieras
innan innehållet läses.

## Typiska agentflöden

- **Håll profilen färsk:** `check`; om `status: update-available`, `apply`; starta sedan om för att
  den nya `Build.*` ska nå apparna.
- **Byt till en annan Pixel-profil:** `fetch-index`, välj en enhetssökväg från indexet, `fetch
  <path>`, kör `analyze` för att bekräfta att konfigurationen är koherent, starta sedan om.
- **Ändra omfattning eller en motor:** redigera `scope_mode` (eller en motoromkopplare) i
  konfigurationsfilen, kör `analyze`, sedan `service.sh --props-only` för egenskapslevererade
  ändringar, eller starta om för Build-fält.

## Säkerhetsspärrar

- Att ändra konfigurationen eller tillämpa en profil ändrar vad varje målapp ser, bekräfta avsikten
  innan du skriver, som WebUI gör.
- Lossa aldrig en verklig koherensspärr: SDK:n är begränsad till det verkliga framework:et under varje
  policy, tillverkaren hålls i takt med resten av profilen, och en profil för en annan enhet avvisas.
  Dessa är avsiktliga och får inte kringgås.
- Konfigurationen är den stödda ytan. Skrapa eller automatisera inte WebUI självt.

<!-- doc-footer -->

---

> _Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas, se [CONTRIBUTING.md](CONTRIBUTING.md)._
