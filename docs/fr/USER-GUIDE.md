> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · Français · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Guide de l'utilisateur

COPG-VD réécrit l'empreinte (fingerprint) et le build de l'appareil pour que les applications
que vous choisissez voient un Pixel au lieu de votre véritable appareil. Ce guide vous mène
de l'installation à une configuration fonctionnelle, en passant par les choix à faire en
chemin. Pour chaque champ et chaque valeur, voir [CONFIGURATION.md](CONFIGURATION.md) ;
pour son fonctionnement interne, voir [ARCHITECTURE.md](ARCHITECTURE.md).

## Installation

1. Flashez le zip dans KernelSU, APatch ou Magisk et redémarrez.
2. Zygisk doit être actif (intégré, ou ReZygisk / Zygisk Next). Utilisateurs de Magisk :
   activez Zygisk.
3. Le module est livré avec un profil Pixel, donc juste après le redémarrage la pile
   Google Play voit déjà ce Pixel. Avec un fingerprint fonctionnel, vous n'avez pas besoin
   de PlayIntegrityFix ni de GooglePhotosUnlimited.

Ouvrez la WebUI depuis votre gestionnaire root pour piloter le module. Les utilisateurs de
Magisk l'ouvrent avec [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).
Tout peut aussi être édité directement dans `/data/adb/COPG-VD.json`.

## Qui voit le spoof (scope)

`scope_mode` décide quels processus reçoivent l'identité usurpée. Dans un mode scoped,
l'identité est livrée par processus par Zygisk et n'est **pas** divulguée au reste du
système via des propriétés globales.

| Mode | Qui reçoit le spoof |
|---|---|
| `playstore` (par défaut) | Seulement la pile Play : Google Play services, son processus instable et le Play Store. |
| `global` | Tout l'appareil : chaque processus. |
| `whitelist` | Seulement les applications listées dans `scope_whitelist`. |
| `blacklist` | Chaque application sauf celles listées dans `scope_blacklist`. |

Commencez par `playstore`. C'est l'option la plus légère et celle qui passe Play Integrity
sans exposer le spoof à des applications non concernées.

## Les moteurs

Chaque moteur est indépendant et peut être désactivé. Tous sont activés par défaut sauf DRM.

- **Champs Build (`motor_jni`)** - réécrit `android.os.Build.*` dans les processus ciblés.
  C'est ce que lisent la plupart des applications.
- **Property hook (`motor_prop_hook`)** - présente les propriétés système usurpées aux
  processus ciblés, via un remap clean-room par processus de la zone des propriétés (pas de
  hook de fonction).
- **resetprop** - réécrit les propriétés système à l'échelle de l'appareil, par groupe
  (identity, version, boot state, SELinux, adb/usb, anti-emulator, et une passe de nettoyage).
  Dans un mode scoped, les groupes identity et version restent hors de la passe à l'échelle
  de l'appareil (Zygisk les livre par processus) ; les groupes boot, lock et SELinux restent
  globaux. Basculez-le dans `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, désactivé par défaut)** - rapporte un niveau de sécurité
  Widevine choisi (L1 ou L3) aux applications qui le lisent. Voir la section DRM ci-dessous.

## Garder le fingerprint à jour

Un fingerprint vieillit : Google fait tourner les images d'usine, et un ancien perd
lentement de sa valeur. `fingerprint-update.sh` garde le vôtre à jour, depuis la plus
récente image d'usine Google.

- Depuis la WebUI (onglet Tools) : **Check Update** et **Update Now**.
- Tout seul, **une fois par démarrage** : **Auto-update JSON on boot** (activé par défaut).
  Il s'exécute en arrière-plan, continue de réessayer pendant environ dix minutes car le
  wifi n'est généralement pas encore actif au démarrage, et ne retarde jamais le démarrage.
- Il réécrit seulement les champs build (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Tout ce que vous avez personnalisé est conservé, et le
  contenu précédent est sauvegardé en `.bak`.
- Il ne revient jamais en arrière (un build upstream plus ancien est refusé), et si votre
  profil usurpe un appareil différent, il n'applique rien - un fingerprint Pixel sur un
  autre profil est pire qu'un ancien.
- `resetprop` est réappliqué juste après une mise à jour, mais `android.os.Build` est écrit
  au démarrage de zygote, donc **redémarrez** pour que les nouvelles valeurs atteignent les
  applications. Journal : `/data/adb/COPG-VD.update.log`.

## Le piège de la version d'Android

La chose la plus difficile à réussir. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` et `CODENAME`
décrivent **votre ROM**, pas l'appareil que vous usurpez. Dire aux applications que le SDK
est plus récent que ne l'est réellement le framework les amène à appeler des API qui
n'existent pas : les applications de Google plantent, le téléphone redémarre, et ça
recommence. Le démarrage lui-même aboutit, c'est donc un **softloop** qui ne laisse rien
dans les journaux de démarrage.

Ces champs ne sont pas dans la config livrée et le updater ne les écrit jamais. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) décide s'ils s'appliquent tout court :

- `never` (par défaut) - la version propre de la ROM est utilisée.
- `rom` - applique seulement ce qui ne dépasse pas la ROM, ce qui en pratique revient à
  abaisser le SDK.
- `force` - applique exactement ce que dit la config. C'est ce qui cause le softloop ; ne
  l'utilisez que si vous savez que le framework cible le supporte.

La version réelle est lue depuis `/system/build.prop`, jamais depuis `getprop` (qui est
précisément ce que ce module falsifie). `force` est aussi refusé lors de la restauration
d'une sauvegarde, de sorte qu'une ancienne sauvegarde ne peut pas le réarmer dans votre dos.

## DRM / Widevine

Désactivé par défaut (`motor_drm`). Quand il est activé, il rapporte un niveau Widevine
choisi, `DRM_SECURITY_LEVEL` (`L1` ou `L3`), aux applications qui le lisent.

Par défaut, le spoof DRM suit `scope_mode`. Pour l'appliquer à un ensemble spécifique
d'applications à la place - indépendamment du scope principal - listez-les dans
`drm_targets`. Le module reste alors chargé dans une application listée **uniquement** pour
le hook DRM, même quand cette application est hors du scope principal ; une liste vide ou
absente signifie suivre le scope. Cela nécessite un mode scoped (pas `global`), et prend
effet au prochain **redémarrage**.

## Analyze : vérifier votre config

**Analyze** dans la WebUI (ou `fingerprint-update.sh analyze`) audite la config telle
qu'elle est et vous dit ce qui ne va pas avant qu'une application ne le fasse :

- la version face à la ROM (ferait-elle un softloop ?),
- si le fichier se parse encore (un fichier cassé fait que le module ne spoofe **rien**, et
  seul logcat le dirait),
- si le fingerprint s'accorde avec les champs qui l'entourent,
- les clés que le module ne lit pas, les dates suspectes, et si les propriétés actives
  portent déjà ce que la config demande.

Lancez-le chaque fois que vous éditez la config à la main.

## La WebUI

Optionnelle, mais la façon facile de tout piloter. Cinq onglets :

- **About** - informations sur le module et la version.
- **Device** - chaque champ build, défini par état et groupé par catégorie.
- **Spoofing** - le mode scope et les interrupteurs des moteurs.
- **System** - les groupes resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, la mise à jour automatique
  au démarrage, et le rapport Diagnostics (un bouton pour lire et exporter tout ce qui est
  utile pour un rapport de bug).

Elle ne fait aucune requête réseau ; tout ce dont elle a besoin est livré dans le module.

## Dépannage

- **Une application voit toujours le véritable appareil.** Vérifiez le scope : en `playstore`,
  seule la pile Play est couverte. Confirmez que la config se parse (lancez Analyze). Après
  avoir changé les moteurs, `drm_targets` ou le profil, **redémarrez** - Zygisk lit le scope
  au démarrage de zygote.
- **Play Integrity échoue toujours.** Assurez-vous que le fingerprint est à jour (Check
  Update) et que `SECURITY_PATCH` est dans `global_fields` pour qu'il reste cohérent à
  l'échelle de l'appareil. Tuez Google Play services pour qu'il re-atteste.
- **Le téléphone fait un softloop après activation du version spoofing.** C'est le piège de
  la version d'Android ci-dessus - remettez `spoof_version` à `never`.
- **La WebUI ne s'ouvre pas sur Magisk.** Utilisez [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [../CONTRIBUTING.md](CONTRIBUTING.md).*
