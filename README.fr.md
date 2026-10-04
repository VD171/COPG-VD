## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD est un module conçu pour l'usurpation globale de l'appareil.  
Cela signifie que même les applications système et l'appareil entier seront interceptés (hooked).  
  
## Comment l'utiliser ?
Si vous utilisez ce module et que vous usurpez un FingerPrint fonctionnel, il n'est pas nécessaire d'utiliser PlayIntegrityFix ou GooglePhotosUnlimited.  
### Exemple de fichier de configuration JSON  
`/data/adb/COPG-VD.json`
* Tous les champs sont OPTIONNELS. Si un champ n'est pas fourni, il sera ignoré.  
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
Veillez à n'utiliser que des chaînes entre guillemets doubles.  
Le bloc ci-dessus et `module/COPG-VD.json.example` sont actualisés quotidiennement par le workflow [Update COPG-VD.json](.github/workflows/update-json.yml), directement à partir de la dernière image d'usine Google.  
### Garder le fingerprint à jour  
`fingerprint-update.sh` récupère ce fichier et met à jour votre configuration, depuis la WebUI (**Check Update** / **Update Now**) ou de lui-même **une fois par démarrage** (**Auto-update JSON on boot**, activé par défaut).  
* `/data/adb/COPG-VD.json` et `/data/adb/modules/COPG-VD/COPG-VD.json` sont tous deux mis à jour lorsqu'ils existent tous les deux, et le contenu précédent est conservé sous `.bak`.  
* Seuls les champs de build sont réécrits (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Tout le reste que vous avez personnalisé est préservé : clés supplémentaires, `BOOTLOADER`/`BOARD`/`HARDWARE`, autres objets, ordre des clés et formatage.  
* Cela ne revient jamais en arrière : un build amont plus ancien que celui installé est refusé. C'est
  normal (le dépôt peut rester en retard par rapport à une config que vous avez mise à jour à la main) et c'est aussi la protection qui
  compte le plus sur Android, où le seul téléchargeur disponible est le `wget` de busybox, qui ne peut pas
  valider les certificats TLS - chaque valeur est validée avant utilisation pour la même raison.  
* Si votre profil usurpe **un autre appareil** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` différents), rien n'est appliqué - un fingerprint Pixel sur un autre profil est pire qu'un fingerprint ancien.  
* Au démarrage, il s'exécute en arrière-plan et continue de réessayer pendant environ 10 minutes, car le wifi n'est généralement pas encore actif à la fin du démarrage. Il ne retarde jamais le démarrage.  
* `resetprop` est réappliqué juste après une mise à jour, mais `android.os.Build` est écrit par le module zygisk lorsque zygote démarre : **redémarrez** pour que les nouvelles valeurs atteignent les applications.  
* Journal dans `/data/adb/COPG-VD.update.log`.  
### Version d'Android - et pourquoi elle n'est pas usurpée  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` et `CODENAME` décrivent **votre ROM**, pas l'appareil usurpé. Dire aux applications que le SDK est plus récent que le framework ne l'est réellement les fait appeler des API qui n'existent pas : les applications de Google plantent, le téléphone redémarre, et cela recommence. Le démarrage lui-même se termine, c'est donc une **softloop** et rien n'apparaît dans les journaux de démarrage.  
* Ils ne sont pas dans la config livrée et le programme de mise à jour ne les écrit jamais.  
* **Spoof Android version** dans la WebUI décide s'ils sont appliqués du tout :  
  * **Never** (par défaut) - la version propre de la ROM est utilisée.  
  * **Up to this ROM** - seulement ce qui ne la dépasse pas, ce qui en pratique signifie abaisser le SDK.  
  * **Force** - exactement ce que dit la config. C'est ce qui provoque la softloop.  
* La version réelle est lue depuis `/system/build.prop`, jamais depuis `getprop` - c'est précisément ce que ce module falsifie.  
### Analyze  
**Analyze** dans la WebUI (ou `fingerprint-update.sh analyze`) audite la config telle qu'elle est : la version par rapport à la ROM, si le fichier se parse toujours (un fichier cassé fait que le module n'usurpe **rien**, et seul logcat le signale), si le fingerprint concorde avec les champs qui l'entourent, les clés que le module ne lit pas, les dates, et si les props portent déjà ce que la config demande.  
### Réglages dans la config  
`COPG-VD.json` peut porter un objet `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - afin que vos choix voyagent avec une sauvegarde et puissent être édités à la main. La WebUI écrit à la fois cela et les fichiers indicateurs (flag) que lisent les scripts de démarrage. `"spoof_version": "force"` est refusé depuis le fichier et rétrogradé : restaurer une ancienne sauvegarde ne doit pas le réarmer à votre insu.  
### WebUI  
L'utilisation de la WebUI est inutile si vous éditez directement le fichier de configuration JSON.  
Si vous êtes un utilisateur de Magisk, utilisez KsuWebUI par KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop :  
Désactivez l'utilisation de resetprop et activez uniquement l'usurpation des infos Build.  
#### Use ro.product.manufacturer :  
Désactivez si vous vous souciez de la détection "Found device spoofing" dans l'application de détection de root Disclosure.  

## Contacts

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram :** @VD_Priv8 https://t.me/VD_Priv8
* **Discord :** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail :** vd.priv8@pm.me
* **XDA-Developers :** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub :** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
