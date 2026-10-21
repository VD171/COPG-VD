## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD est un usurpateur d'appareil : il réécrit le fingerprint et le build de l'appareil pour que les applications voient l'appareil que vous choisissez au lieu du vrai.  
Il fonctionne sur Zygisk (KernelSU, APatch ou Magisk) et, par défaut, limite la portée de l'usurpation à la pile Google Play - ce qui en fait une alternative plus légère et plus robuste à PlayIntegrityFix.  

## Captures d'écran

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Comment l'utiliser ?
Installez le module, redémarrez, et le profil livré (un Pixel) est usurpé auprès des applications ciblées. Avec un fingerprint fonctionnel, vous n'avez besoin ni de PlayIntegrityFix ni de GooglePhotosUnlimited.  
Tout se configure dans `/data/adb/COPG-VD.json`, ou depuis la WebUI. Tous les champs sont OPTIONNELS - un champ qui n'est pas fourni est ignoré.  

### Scope - qui voit l'usurpation
`scope_mode` décide quels processus reçoivent l'identité usurpée. Dans un mode à portée restreinte, l'identité est livrée par processus par Zygisk et n'est pas divulguée au reste du système via les propriétés globales.  
* **Google Play** (`playstore`, par défaut) - uniquement la pile Play (Google Play services, son processus unstable et le Play Store).  
* **Global** - tout l'appareil ; chaque processus la voit.  
* **Whitelist** - uniquement les applications listées dans `scope_whitelist`.  
* **Blacklist** - toutes les applications sauf celles listées dans `scope_blacklist`.  

### Engines - comment l'usurpation est livrée
Chacun est indépendant et peut être désactivé :  
* **Build fields (JNI)** - réécrit `android.os.Build.*` dans les processus ciblés.  
* **Property hook** - présente les propriétés système usurpées aux processus ciblés (un remappage clean-room par processus de la zone des propriétés, sans hook de fonction).  
* **resetprop** - réécrit les propriétés système, géré par groupe : identité, version, état de boot, SELinux, adb/usb, anti-émulateur et une passe de nettoyage. Dans un mode à portée restreinte, les groupes identité et version restent en dehors du resetprop appliqué à tout l'appareil (Zygisk les livre par processus) ; les groupes boot/lock/SELinux restent globaux.  
* **DRM / Widevine** (désactivé par défaut) - rapporte un niveau de sécurité Widevine choisi, L1 ou L3, aux applications qui le lisent.  

### Fields - définir, vider, supprimer ou ignorer
À l'intérieur de l'objet `COPG-VD`, chaque champ Build a quatre états :  
* **Set** - `"KEY": "value"` écrit la valeur.  
* **Empty** - `"KEY": ""` écrit une valeur vide.  
* **Delete** - listez la clé dans un `"COPG-VD-Delete": [ ... ]` de premier niveau pour la supprimer (un champ Build devient null, une propriété est supprimée avec `resetprop --delete`).  
* **Skip** - laissez la clé totalement de côté ; la valeur propre de la ROM est conservée.  

Une liste `"global_fields": [ ... ]` applique les champs Build nommés à tout l'appareil même dans un mode à portée restreinte, afin de garder une valeur cohérente partout - uniquement pour les champs sûrs vis-à-vis de la cohérence (le security patch, par exemple), jamais l'identité et jamais le groupe de la version d'Android.  

### Exemple de fichier de configuration JSON
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
Veillez à n'utiliser que des chaînes entre guillemets doubles.  
Le bloc ci-dessus et `module/COPG-VD.json.example` sont actualisés quotidiennement par le workflow [Update COPG-VD.json](.github/workflows/update-json.yml), directement à partir de la dernière image d'usine Google.  

### Garder le fingerprint à jour
`fingerprint-update.sh` récupère ce fichier et met à jour votre configuration, depuis la WebUI (**Check Update** / **Update Now**) ou de lui-même **une fois par démarrage** (**Auto-update JSON on boot**, activé par défaut).  
* `/data/adb/COPG-VD.json` et `/data/adb/modules/COPG-VD/COPG-VD.json` sont tous deux mis à jour lorsqu'ils existent tous les deux, et le contenu précédent est conservé sous `.bak`.  
* Seuls les champs de build sont réécrits (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Tout le reste que vous avez personnalisé est préservé : clés supplémentaires, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, autres objets, ordre des clés et formatage.  
* Cela ne revient jamais en arrière : un build amont plus ancien que celui installé est refusé. C'est normal (le dépôt peut rester en retard par rapport à une config que vous avez mise à jour à la main) et c'est aussi la protection qui compte le plus sur Android, où le seul téléchargeur disponible est le `wget` de busybox, qui ne peut pas valider les certificats TLS - chaque valeur est validée avant utilisation pour la même raison.  
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

### WebUI
La WebUI est optionnelle - tout peut être édité directement dans la config JSON - mais c'est le moyen facile de piloter le module. Elle comporte cinq onglets : **About**, **Device** (chaque champ, défini par état, groupé par catégorie), **Spoofing** (scope et engines), **System** (les groupes resetprop) et **Tools** (Analyze, Check Update, Update Now, Backup/Restore et l'auto-update au démarrage). Elle ne fait aucune requête réseau ; tout ce dont elle a besoin est livré à l'intérieur du module.  
Si vous êtes un utilisateur de Magisk, utilisez KsuWebUI par KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Réglages dans la config
`COPG-VD.json` porte ses réglages à côté du profil, de sorte que vos choix voyagent avec une sauvegarde et peuvent être édités à la main : `scope_mode`, les interrupteurs des engines, les groupes resetprop, `global_fields`, et un objet `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). La WebUI écrit à la fois la config et les fichiers indicateurs (flag) que lisent les scripts de démarrage. `"spoof_version": "force"` est refusé depuis le fichier et rétrogradé : restaurer une ancienne sauvegarde ne doit pas le réarmer à votre insu.  

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
