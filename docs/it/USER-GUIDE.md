> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · Italiano · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Guida utente

COPG-VD riscrive il fingerprint e la build del dispositivo in modo che le app che scegli vedano un Pixel
invece del tuo dispositivo reale. Questa guida ti accompagna dall'installazione a una configurazione
funzionante e attraverso le scelte lungo il percorso. Per ogni campo e valore, vedi [CONFIGURATION.md](CONFIGURATION.md);
per capire come funziona internamente, vedi [ARCHITECTURE.md](ARCHITECTURE.md).

## Installazione

1. Flasha lo zip in KernelSU, APatch o Magisk e riavvia.
2. Zygisk deve essere attivo (integrato, oppure ReZygisk / Zygisk Next). Utenti Magisk: abilitate Zygisk.
3. Il modulo include un profilo Pixel, quindi subito dopo il riavvio lo stack di Google Play
   vede già quel Pixel. Con un fingerprint funzionante non hai bisogno di PlayIntegrityFix o
   GooglePhotosUnlimited.

Apri la WebUI dal tuo root manager per pilotare il modulo. Gli utenti Magisk la aprono con
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Tutto
può anche essere modificato direttamente in `/data/adb/COPG-VD.json`.

## Chi vede lo spoof (scope)

`scope_mode` decide quali processi ricevono l'identità falsificata. In una modalità scoped l'identità
viene consegnata per processo da Zygisk e **non** viene trapelata al resto del
sistema tramite proprietà globali.

| Modalità | Chi riceve lo spoof |
|---|---|
| `playstore` (predefinita) | Solo lo stack Play: Google Play services, il suo processo unstable e il Play Store. |
| `global` | L'intero dispositivo: ogni processo. |
| `whitelist` | Solo le app elencate in `scope_whitelist`. |
| `blacklist` | Ogni app tranne quelle in `scope_blacklist`. |

Inizia con `playstore`. È l'opzione più leggera e quella che supera Play Integrity
senza esporre lo spoof ad app non correlate.

## I motori

Ogni motore è indipendente e può essere disattivato. Tutti sono attivi di default tranne il DRM.

- **Campi Build (`motor_jni`)** - riscrive `android.os.Build.*` nei processi
  interessati. È ciò che la maggior parte delle app legge.
- **Hook delle proprietà (`motor_prop_hook`)** - presenta le proprietà di sistema falsificate ai
  processi interessati, tramite un remap clean-room per processo dell'area delle proprietà (nessun
  hook di funzione).
- **resetprop** - riscrive le proprietà di sistema a livello dell'intero dispositivo, per gruppo (identità,
  versione, stato di boot, SELinux, adb/usb, anti-emulatore e una passata di pulizia). In una modalità
  scoped i gruppi identità e versione restano fuori dalla passata device-wide (Zygisk li consegna
  per processo); i gruppi boot, lock e SELinux restano globali. Attivalo in
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, disattivato di default)** - riporta un livello di sicurezza Widevine
  scelto (L1 o L3) alle app che lo leggono. Vedi la sezione DRM più sotto.

## Mantenere il fingerprint aggiornato

Un fingerprint invecchia: Google ruota le factory image, e uno vecchio perde lentamente valore.
`fingerprint-update.sh` mantiene il tuo aggiornato, dalla factory image Google più recente.

- Dalla WebUI (scheda Tools): **Check Update** e **Update Now**.
- Da solo, **una volta per boot**: **Auto-update JSON on boot** (attivo di default). Gira in
  background, continua a ritentare per circa dieci minuti perché di solito il wifi non è ancora
  attivo al boot, e non ritarda mai il boot.
- Riscrive solo i campi Build (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Tutto ciò che hai personalizzato viene mantenuto, e il contenuto
  precedente viene salvato come `.bak`.
- Non torna mai indietro (una build upstream più vecchia viene rifiutata), e se il tuo profilo falsifica
  un dispositivo diverso non applica nulla - un fingerprint Pixel su un altro profilo è peggio
  di uno vecchio.
- `resetprop` viene riapplicato subito dopo un aggiornamento, ma `android.os.Build` viene scritto quando
  lo zygote si avvia, quindi **riavvia** affinché i nuovi valori raggiungano le app. Log:
  `/data/adb/COPG-VD.update.log`.

## La trappola della versione Android

La cosa più difficile da azzeccare. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME`
descrivono **la tua ROM**, non il dispositivo che falsifichi. Dire alle app che l'SDK è più recente del
framework reale le fa chiamare API che non esistono: le app di Google crashano, il telefono
si riavvia, e ricomincia da capo. Il boot stesso si completa, quindi è un **softloop** che
non lascia nulla nei log di boot.

Questi campi non sono nella config inclusa e l'updater non li scrive mai. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) decide se vengono applicati del tutto:

- `never` (predefinito) - viene usata la versione stessa della ROM.
- `rom` - applica solo ciò che non supera la ROM, che in pratica significa abbassare l'SDK.
- `force` - applica esattamente ciò che dice la config. È questo che causa il softloop; usalo
  solo se sai che il framework di destinazione lo supporta.

La versione reale viene letta da `/system/build.prop`, mai da `getprop` (che è proprio
la cosa che questo modulo falsifica). `force` viene anche rifiutato durante il ripristino di un backup, così un
vecchio backup non può riarmarlo alle tue spalle.

## DRM / Widevine

Disattivato di default (`motor_drm`). Quando attivo, riporta un livello Widevine scelto,
`DRM_SECURITY_LEVEL` (`L1` o `L3`), alle app che lo leggono.

Di default lo spoof DRM segue `scope_mode`. Per applicarlo a un insieme specifico di app
invece - indipendentemente dallo scope principale - elencale in `drm_targets`. Il modulo allora
resta caricato in un'app elencata **solo** per l'hook DRM, anche quando quell'app è fuori dallo
scope principale; una lista vuota o assente significa seguire lo scope. Questo richiede una modalità scoped (non
`global`), e ha effetto al prossimo **riavvio**.

## Analyze: controlla la tua config

**Analyze** nella WebUI (o `fingerprint-update.sh analyze`) verifica la config così com'è
e ti dice cosa non va prima che lo faccia un'app:

- la versione rispetto alla ROM (causerebbe un softloop?),
- se il file viene ancora parsato (uno rotto fa sì che il modulo non falsifichi **niente**, e solo
  logcat lo direbbe),
- se il fingerprint concorda con i campi che lo circondano,
- chiavi che il modulo non legge, date sospette, e se le proprietà live già
  portano ciò che la config chiede.

Eseguilo ogni volta che modifichi la config a mano.

## La WebUI

Opzionale, ma il modo semplice per pilotare tutto. Cinque schede:

- **About** - info sul modulo e sulla versione.
- **Device** - ogni campo Build, impostato per stato e raggruppato per categoria.
- **Spoofing** - modalità scope e gli interruttori dei motori.
- **System** - i gruppi di resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, l'auto-update al boot,
  e il report Diagnostics (un pulsante per leggere ed esportare tutto ciò che è utile per un bug
  report).

Non effettua alcuna richiesta di rete; tutto ciò di cui ha bisogno è incluso nel modulo.

## Risoluzione dei problemi

- **Un'app vede ancora il dispositivo reale.** Controlla lo scope: in `playstore` è coperto solo lo stack
  Play. Conferma che la config venga parsata (esegui Analyze). Dopo aver cambiato i motori,
  `drm_targets` o il profilo, **riavvia** - Zygisk legge lo scope quando lo zygote si avvia.
- **Play Integrity fallisce ancora.** Assicurati che il fingerprint sia aggiornato (Check Update) e
  che il `SECURITY_PATCH` sia in `global_fields` così da restare coerente a livello dell'intero dispositivo. Termina
  Google Play services così da fargli rifare l'attestazione.
- **Il telefono va in softloop dopo aver abilitato lo spoof della versione.** È la trappola della versione
  Android qui sopra - rimetti `spoof_version` su `never`.
- **La WebUI non si apre su Magisk.** Usa KsuWebUIStandalone (link sopra).

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [../CONTRIBUTING.md](CONTRIBUTING.md).*
