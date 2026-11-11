> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · Italiano · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architettura

COPG-VD è un modulo Zygisk: una piccola libreria nativa (`libspoof.so`) che il loader Zygisk
inietta nello zygote e, da lì, nei processi delle app. Tutto ciò che fa è presentare
un'identità di dispositivo scelta ai processi che prendi di mira. Non c'è alcuna app e, a parte
il fetch opzionale del profilo, nessuna rete.

## Ciclo di vita

1. **Avvio dello zygote.** Quando lo zygote si avvia, il loader chiama l'`onLoad` del modulo. Esso
   legge `/data/adb/COPG-VD/COPG-VD.json` una volta: la configurazione dello scope e il profilo.
2. **Fork dell'app.** Per ogni app che lo zygote forka, il modulo decide in
   `preAppSpecialize` se questo processo è nello scope:
   - **nello scope principale** (`playstore` / `global` / `whitelist` / `blacklist`), oppure
   - **nello scope DRM** (elencato in `drm_targets`).
   Se non è in nessuno dei due, il modulo si **stacca** da quel processo (`dlclose`) e non lascia
   alcuna traccia in esso.
3. **Specialize.** Per un processo che resta, i motori si applicano in `postAppSpecialize`,
   mentre il processo è ancora privilegiato.

Poiché i fork ereditano la copia della memoria dello zygote in copy-on-write, ogni app parte dalla config
letta al boot. Il modulo rilegge il file per processo interessato solo quando esso è effettivamente
cambiato, così un'app appena avviata o riaperta raccoglie un profilo modificato - ma la decisione
sullo scope stessa viene presa all'avvio dello zygote, quindi **cambiare lo scope, i motori o
`drm_targets` richiede un riavvio**.

## I motori

Ognuno è indipendente e commutabile.

- **Campi Build (`motor_jni`).** Riscrive `android.os.Build.*` (e `Build.VERSION.*`)
  nel processo interessato tramite JNI, così il codice Java legge i valori falsificati.
- **Hook delle proprietà (`motor_prop_hook`).** Presenta le proprietà di sistema falsificate al
  processo tramite un remap clean-room, per processo, dell'area delle proprietà (`prop_virtualizer`).
  È un remap di memoria, non un hook di funzione, quindi non c'è footprint di funzione hookata.
- **resetprop (device-wide).** Scrive le proprietà di sistema per gruppo - identità, versione,
  stato di boot, SELinux, adb/usb, anti-emulatore, più una passata di pulizia. Lo eseguono gli script di boot.
  In una modalità scoped i gruppi identità e versione vengono lasciati fuori (Zygisk li consegna
  per processo); i gruppi boot, lock e SELinux restano globali così il dispositivo è coerente.
- **DRM / Widevine (`motor_drm`).** Hooka i metodi `MediaDrm` che riportano il livello di sicurezza
  Widevine (`getSecurityLevel`, `getPropertyString`) e restituisce il livello configurato.
  Gli hook sono null-checked, così un profilo malformato degrada con grazia invece di
  far crashare l'app. `drm_targets` permette a questo motore di girare sulla propria lista di app, disaccoppiata dallo
  scope principale.

## Lettura della config

Il processo iniettato gira nel dominio SELinux dello zygote, che di default non può raggiungere
`/data/adb`. Il modulo include il proprio `sepolicy.rule` per permetterlo e, come fallback,
può leggere la config tramite la propria directory di modulo aperta (`getModuleDir`), così continua a
funzionare anche se una build Zygisk smette di concedere il path. Il file viene parsato con un piccolo
parser JSON incorporato (`jsmn`); un file che non viene parsato significa che il modulo non falsifica niente.

## Mantenere il profilo aggiornato

`fingerprint-update.sh` aggiorna i campi Build dalla factory image Google più recente,
dalla WebUI o una volta per boot. Usa il downloader incluso proprio del modulo (non un `curl`/`wget` dal
`PATH`), valida ogni valore prima dell'uso, non torna mai indietro, e rifiuta un
profilo che falsifica un dispositivo diverso. `android.os.Build` viene scritto all'avvio dello zygote, così
i nuovi valori raggiungono le app al riavvio successivo. Vedi [USER-GUIDE.md](USER-GUIDE.md) per il lato
utente e [CONFIGURATION.md](CONFIGURATION.md) per i campi.

## Perché la versione Android non viene falsificata di default

Alzare `SDK_INT` / `ANDROID_VERSION` oltre ciò che il framework della ROM è realmente fa sì che le app
chiamino API che non esistono, il che fa crashare le app di Google e riavvia il telefono in un
softloop. Il gruppo versione è quindi disattivato di default e protetto dietro
`spoof_version`. Il modulo legge la versione reale da `/system/build.prop`, mai da
`getprop`, perché `getprop` è esattamente ciò che falsifica. Vedi la trappola in
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Questa documentazione è stata generata con Claude (Anthropic) ed è mantenuta da VD171. Correzioni e miglioramenti sono benvenuti - vedi [../CONTRIBUTING.md](CONTRIBUTING.md).*
