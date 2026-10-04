## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD è un modulo progettato per lo spoofing globale del dispositivo.  
Questo significa che anche le app di sistema e l'intero dispositivo saranno agganciati (hooked).  
  
## Come si usa?
Se usi questo modulo e fai lo spoofing di un FingerPrint funzionante, non è necessario usare PlayIntegrityFix o GooglePhotosUnlimited.  
### Esempio di file di configurazione JSON  
`/data/adb/COPG-VD.json`
* Tutti i campi sono OPZIONALI. Se un campo non viene fornito, verrà saltato.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
Assicurati di usare le stringhe solo tra virgolette doppie.  
Il blocco qui sopra e `module/COPG-VD.json.example` vengono aggiornati quotidianamente dal workflow [Update COPG-VD.json](.github/workflows/update-json.yml), direttamente dalla più recente immagine di fabbrica Google.  
### Mantenere aggiornato il fingerprint  
`fingerprint-update.sh` scarica quel file e aggiorna la tua configurazione, dalla WebUI (**Check Update** / **Update Now**) oppure da solo **una volta per avvio** (**Auto-update JSON on boot**, attivo per impostazione predefinita).  
* Sia `/data/adb/COPG-VD.json` sia `/data/adb/modules/COPG-VD/COPG-VD.json` vengono aggiornati quando esistono entrambi, e il contenuto precedente viene conservato come `.bak`.  
* Vengono riscritti solo i campi di build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Tutto il resto che hai personalizzato viene preservato: chiavi extra, `BOOTLOADER`/`BOARD`/`HARDWARE`, altri oggetti, ordine delle chiavi e formattazione.  
* Non torna mai indietro: una build upstream più vecchia di quella installata viene rifiutata. Questo è
  normale (il repository può restare indietro rispetto a una configurazione che hai aggiornato a mano) ed è anche la protezione che
  conta di più su Android, dove l'unico downloader disponibile è il `wget` di busybox, che non può
  validare i certificati TLS - per lo stesso motivo ogni valore viene validato prima dell'uso.  
* Se il tuo profilo fa lo spoofing di **un altro dispositivo** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` diversi), non viene applicato nulla - un fingerprint Pixel su un altro profilo è peggio di un fingerprint vecchio.  
* All'avvio viene eseguito in background e continua a riprovare per circa 10 minuti, perché di solito il wifi non è ancora attivo quando l'avvio finisce. Non ritarda mai l'avvio.  
* `resetprop` viene riapplicato subito dopo un aggiornamento, ma `android.os.Build` viene scritto dal modulo zygisk quando zygote si avvia: **riavvia** affinché i nuovi valori raggiungano le app.  
* Log in `/data/adb/COPG-VD.update.log`.  
### Versione di Android - e perché non viene falsificata  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME` descrivono **la tua ROM**, non il dispositivo di cui si fa lo spoofing. Dire alle app che l'SDK è più recente di quanto il framework sia realmente le fa chiamare API che non esistono: le app di Google si bloccano, il telefono si riavvia e tutto ricomincia. L'avvio stesso si completa, quindi è un **softloop** e nei log di avvio non compare nulla.  
* Non sono nella configurazione distribuita e l'updater non li scrive mai.  
* **Spoof Android version** nella WebUI decide se vengano applicati affatto:  
  * **Never** (predefinito) - viene usata la versione propria della ROM.  
  * **Up to this ROM** - solo ciò che non la supera, il che in pratica significa abbassare l'SDK.  
  * **Force** - esattamente ciò che dice la configurazione. È questo che provoca il softloop.  
* La versione reale viene letta da `/system/build.prop`, mai da `getprop` - che è proprio la cosa che questo modulo falsifica.  
### Analyze  
**Analyze** nella WebUI (o `fingerprint-update.sh analyze`) verifica la configurazione così com'è: la versione rispetto alla ROM, se il file è ancora analizzabile (uno rotto fa sì che il modulo non faccia lo spoofing di **nulla**, e solo logcat lo segnala), se il fingerprint concorda con i campi circostanti, le chiavi che il modulo non legge, le date e se le props contengono già ciò che la configurazione richiede.  
### Impostazioni nella configurazione  
`COPG-VD.json` può contenere un oggetto `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - in modo che le tue scelte viaggino con un backup e possano essere modificate a mano. La WebUI scrive sia quello sia i file flag che gli script di avvio leggono. `"spoof_version": "force"` viene rifiutato dal file e declassato: ripristinare un vecchio backup non deve riattivarlo a tua insaputa.  
### WebUI  
Usare la WebUI non è necessario se modifichi direttamente il file di configurazione JSON.  
Se sei un utente Magisk, usa KsuWebUI di KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Disabilita l'uso di resetprop e abilita solo lo spoof delle info Build.  
#### Use ro.product.manufacturer:  
Disabilita se ti interessa il rilevamento "Found device spoofing" nell'app di rilevamento root Disclosure.  

## Contatti

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
