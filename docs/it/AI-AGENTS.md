> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · Italiano · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Agenti IA : la superficie di controllo

COPG-VD accoglie i contributori IA e agenti, e l'intero modulo è costruito per essere pilotato senza
interfaccia, senza scrapare la WebUI. Ci sono due superfici, e un agente in esecuzione come root (come fa la
WebUI) le usa entrambe :

1. **Il file di configurazione** `/data/adb/COPG-VD/COPG-VD.json` - l'unica fonte di verità. Ogni campo di
   profilo e ogni impostazione risiede qui ; leggere e scrivere questo file è il modo per cambiare ciò che
   il modulo contraffà.
2. **Il punto di ingresso shell** `fingerprint-update.sh` - un solo script con verbi stabili per
   verificare, applicare e recuperare profili.

## Il file di configurazione

`/data/adb/COPG-VD/COPG-VD.json` è un semplice oggetto JSON. Il modulo lo legge dai processi iniettati
attraverso una regola SELinux dedicata che fornisce esso stesso ; non contiene alcuna credenziale. Un
esempio incluso si trova in `module/COPG-VD.json.example`, aggiornato quotidianamente dalla più recente
immagine di fabbrica Google.

Regole che un agente deve seguire :

- **Le stringhe usano solo virgolette doppie**, come in JSON.
- **Ogni campo è opzionale.** Un campo che non viene fornito è saltato e il valore proprio della ROM è
  mantenuto.
- Le chiavi di primo livello che pilotano il modulo sono `scope_mode`, `scope_whitelist`,
  `scope_blacklist`, `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, l'oggetto `COPG-VD`
  (i campi Build), una lista `COPG-VD-Delete` e un oggetto `COPG-VD-Settings` (`resetprop`, `autoupdate`,
  `spoof_version`). La [referenza di configurazione](CONFIGURATION.md) documenta ciascuna di esse.
- `"spoof_version": "force"` è rifiutato quando proviene dal file su disco ed è retrocesso alla lettura,
  così ripristinare un vecchio backup non può riarmarlo in silenzio. Imposta la politica di versione
  attraverso le impostazioni, non scrivendo `force` a mano.
- Dopo aver modificato il file, esegui **`analyze`** (sotto) : un file che non viene analizzato fa sì che
  il modulo non contraffaccia **niente**, e solo logcat lo segnala.

Una config modificata raggiunge le applicazioni al prossimo avvio di processo. Le proprietà consegnate da
`resetprop` possono essere riapplicate senza riavvio (`service.sh --props-only`), ma i campi
`android.os.Build.*` sono scritti dalla libreria Zygisk all'avvio di zygote, quindi **è richiesto un
riavvio** perché questi raggiungano le applicazioni.

## Il contratto shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Lo script stampa righe leggibili da un umano ; quelle leggibili da una macchina iniziano con `status:`. Il
suo codice di uscita è `0` in caso di successo e diverso da zero in caso di fallimento.

| Verbo | Cosa fa | Output tipico |
|---|---|---|
| `check` | Confronta il profilo installato con il più recente build a monte, non scrive niente. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Recupera il profilo più recente e lo fonde nella config (solo campi Build ; le altre tue chiavi sono preservate). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Verifica la config così com'è (parse, versione vs ROM, coerenza del fingerprint, chiavi sconosciute, date, props). Stampa un rapporto ; il codice di uscita riflette i riscontri red/warn. | un rapporto testuale |
| `fetch-index` | Scarica e verifica l'indice dei dispositivi firmato e lo stampa (`index.json`). | il JSON dell'indice \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Scarica il `build.prop` di un dispositivo (percorso dall'indice, per es. `pixel-9a/latest.prop`) e scrive i suoi campi Build nella config. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migra lo stato/la config dal vecchio layout piatto a `/data/adb/COPG-VD/`. | - |
| `migrate` | Migrazione una tantum della config tra versioni del modulo. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | L'auto-aggiornamento una volta per avvio ; destinato a `service.sh`, non all'uso interattivo. | scrive `update.status` |

Ogni download è validato prima dell'uso (l'unico downloader sul dispositivo è il `wget` di busybox, che non
può validare il TLS), e l'aggiornatore di profilo non torna mai indietro : un build a monte più vecchio di
quello installato è rifiutato. L'indice del feed e ogni `.prop` portano una firma ed25519 staccata che è
verificata prima che il contenuto sia letto.

## Flussi di agente tipici

- **Mantenere il profilo aggiornato :** `check` ; se `status: update-available`, `apply` ; poi riavvia
  perché i nuovi `Build.*` raggiungano le applicazioni.
- **Passare a un altro profilo Pixel :** `fetch-index`, scegli un percorso di dispositivo dall'indice,
  `fetch <path>`, esegui `analyze` per confermare che la config sia coerente, poi riavvia.
- **Cambiare l'ambito o un engine :** modifica `scope_mode` (o un interruttore di engine) nel file di
  configurazione, esegui `analyze`, poi `service.sh --props-only` per i cambiamenti consegnati tramite
  proprietà, o riavvia per i campi Build.

## Protezioni di sicurezza

- Cambiare la config o applicare un profilo cambia ciò che vede ogni applicazione bersaglio ; conferma
  l'intento prima di scrivere, come fa la WebUI.
- Non allentare mai una protezione di coerenza reale : il SDK è limitato al framework reale sotto ogni
  politica, il produttore resta in accordo con il resto del profilo, e un profilo destinato a un altro
  dispositivo è rifiutato. Sono scelte deliberate che non devono essere aggirate.
- La config è la superficie supportata. Non scrapare e non automatizzare la WebUI stessa.

<!-- doc-footer -->

---

> _Questa documentazione è stata generata con Claude (Anthropic) ed è gestita da VD171. Correzioni e miglioramenti sono benvenuti; vedi [CONTRIBUTING.md](CONTRIBUTING.md)._
