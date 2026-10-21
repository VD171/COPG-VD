## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD è uno spoofer di dispositivo: riscrive il fingerprint e la build del dispositivo in modo che le app vedano il dispositivo che scegli invece di quello reale.  
Funziona su Zygisk (KernelSU, APatch o Magisk) e, per impostazione predefinita, limita lo spoof allo stack di Google Play - quindi è un'alternativa più leggera e più robusta a PlayIntegrityFix.  

## Screenshot

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Come si usa?
Installa il modulo, riavvia, e il profilo distribuito (un Pixel) viene spoofato verso le app interessate. Con un fingerprint funzionante non hai bisogno di PlayIntegrityFix o GooglePhotosUnlimited.  
Tutto si configura in `/data/adb/COPG-VD.json`, oppure dalla WebUI. Tutti i campi sono OPZIONALI - un campo non fornito viene saltato.  

### Scope - chi vede lo spoof
`scope_mode` decide quali processi ricevono l'identità spoofata. In una modalità con ambito limitato l'identità viene consegnata per processo da Zygisk e non trapela al resto del sistema attraverso le proprietà globali.  
* **Google Play** (`playstore`, il valore predefinito) - solo lo stack di Play (Google Play services, il suo processo unstable e il Play Store).  
* **Global** - l'intero dispositivo; ogni processo lo vede.  
* **Whitelist** - solo le app in `scope_whitelist`.  
* **Blacklist** - tutte le app tranne quelle in `scope_blacklist`.  

### Engine - come viene consegnato lo spoof
Ognuno è indipendente e può essere disattivato:  
* **Build fields (JNI)** - riscrive `android.os.Build.*` nei processi interessati.  
* **Property hook** - presenta le proprietà di sistema spoofate ai processi interessati (una rimappatura clean-room per processo dell'area delle proprietà, senza hook di funzione).  
* **resetprop** - riscrive le proprietà di sistema, gestite per gruppo: identità, versione, stato di avvio, SELinux, adb/usb, anti-emulatore e una passata di pulizia. In una modalità con ambito limitato i gruppi identità e versione restano fuori dal resetprop applicato a tutto il dispositivo (Zygisk li consegna per processo); i gruppi boot/lock/SELinux restano globali.  
* **DRM / Widevine** (disattivato per impostazione predefinita) - riporta un livello di sicurezza Widevine scelto, L1 o L3, alle app che lo leggono.  

### Campi - impostare, vuoto, eliminare o saltare
All'interno dell'oggetto `COPG-VD` ogni campo Build ha quattro stati:  
* **Set** - `"KEY": "value"` scrive il valore.  
* **Empty** - `"KEY": ""` scrive un valore vuoto.  
* **Delete** - elenca la chiave in un `"COPG-VD-Delete": [ ... ]` di primo livello per rimuoverla (un campo Build diventa null, una proprietà viene rimossa con `resetprop --delete`).  
* **Skip** - ometti del tutto la chiave; viene mantenuto il valore proprio della ROM.  

Una lista `"global_fields": [ ... ]` applica i campi Build indicati a tutto il dispositivo anche in una modalità con ambito limitato, per mantenere un valore coerente ovunque - solo per campi sicuri dal punto di vista della coerenza (la security patch, ad esempio), mai l'identità e mai il gruppo della versione di Android.  

### Esempio di file di configurazione JSON
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.260918.007-factory-f5955275.zip",
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.260918.007/16484274:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.260918.007",
    "ID": "ZP11.260918.007",
    "HOST": "51b22e6d8afb",
    "INCREMENTAL": "16484274",
    "TIMESTAMP": "1790806751",
    "PREVIEW_SDK": "20261007",
    "USER": "android-build",
    "SDK_FINGERPRINT": "d9ad4b00fa641d6e43c42cc969f49492",
    "UUID": "_mQOcxvuFzRVZAjNEr2UUUpk2fv0mqDc8RpFyaeJjuk",
    "SECURITY_PATCH": "2026-10-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "global_fields": ["SECURITY_PATCH"]
}
```
Assicurati di usare le stringhe solo tra virgolette doppie.  
Il blocco qui sopra e `module/COPG-VD.json.example` vengono aggiornati quotidianamente dal workflow [Update COPG-VD.json](.github/workflows/update-json.yml), direttamente dalla più recente immagine di fabbrica Google.  

### Mantenere aggiornato il fingerprint
`fingerprint-update.sh` scarica quel file e aggiorna la tua configurazione, dalla WebUI (**Check Update** / **Update Now**) oppure da solo **una volta per avvio** (**Auto-update JSON on boot**, attivo per impostazione predefinita).  
* Sia `/data/adb/COPG-VD.json` sia `/data/adb/modules/COPG-VD/COPG-VD.json` vengono aggiornati quando esistono entrambi, e il contenuto precedente viene conservato come `.bak`.  
* Vengono riscritti solo i campi di build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Tutto il resto che hai personalizzato viene preservato: chiavi extra, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, altri oggetti, ordine delle chiavi e formattazione.  
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

### WebUI
La WebUI è opzionale - tutto può essere modificato direttamente nella configurazione JSON - ma è il modo più semplice per gestire il modulo. Ha cinque schede: **About**, **Device** (ogni campo, impostato per stato, raggruppato per categoria), **Spoofing** (ambito ed engine), **System** (i gruppi resetprop) e **Tools** (Analyze, Check Update, Update Now, Backup/Restore e l'auto-aggiornamento all'avvio). Non effettua alcuna richiesta di rete; tutto ciò di cui ha bisogno è incluso nel modulo.  
Se sei un utente Magisk, usa KsuWebUI di KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Impostazioni nella configurazione
`COPG-VD.json` porta le sue impostazioni accanto al profilo, così le tue scelte viaggiano con un backup e possono essere modificate a mano: `scope_mode`, gli interruttori degli engine, i gruppi resetprop, `global_fields` e un oggetto `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). La WebUI scrive sia la configurazione sia i file flag che gli script di avvio leggono. `"spoof_version": "force"` viene rifiutato dal file e declassato: ripristinare un vecchio backup non deve riattivarlo a tua insaputa.  

## Contatti

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tag:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
