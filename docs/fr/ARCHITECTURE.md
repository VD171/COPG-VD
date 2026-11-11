> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · Français · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Architecture

COPG-VD est un module Zygisk : une petite bibliothèque native (`libspoof.so`) que le loader
Zygisk injecte dans le zygote et, de là, dans les processus des applications. Tout ce qu'il
fait est de présenter une identité d'appareil choisie aux processus que vous ciblez. Il n'y
a pas d'application et, hormis la récupération optionnelle du profil, pas de réseau.

## Cycle de vie

1. **Démarrage de Zygote.** Quand le zygote démarre, le loader appelle le `onLoad` du
   module. Il lit `/data/adb/COPG-VD/COPG-VD.json` une fois : la configuration du scope et le profil.
2. **Fork de l'application.** Pour chaque application que le zygote fork, le module décide
   dans `preAppSpecialize` si ce processus est dans le scope :
   - **dans le scope principal** (`playstore` / `global` / `whitelist` / `blacklist`), ou
   - **dans le scope DRM** (listé dans `drm_targets`).
   S'il n'est ni l'un ni l'autre, le module **se détache** de ce processus (`dlclose`) et
   n'y laisse aucune trace.
3. **Specialize.** Pour un processus qui reste, les moteurs s'appliquent dans
   `postAppSpecialize`, pendant que le processus est encore privilégié.

Comme les forks héritent de la copie copy-on-write de la mémoire du zygote, chaque
application part de la config lue au démarrage. Le module relit le fichier par processus
ciblé seulement quand il a réellement changé, de sorte qu'une application nouvellement
démarrée ou rouverte prend un profil édité - mais la décision de scope elle-même est prise
au démarrage du zygote, donc **changer le scope, les moteurs ou `drm_targets` nécessite un
redémarrage**.

## Les moteurs

Chacun est indépendant et commutable.

- **Champs Build (`motor_jni`).** Réécrit `android.os.Build.*` (et `Build.VERSION.*`) dans
  le processus ciblé via JNI, pour que le code Java lise les valeurs usurpées.
- **Property hook (`motor_prop_hook`).** Présente les propriétés système usurpées au
  processus via un remap clean-room, par processus, de la zone des propriétés
  (`prop_virtualizer`). C'est un remap mémoire, pas un hook de fonction, donc il n'y a pas
  d'empreinte de fonction hookée.
- **resetprop (à l'échelle de l'appareil).** Écrit les propriétés système par groupe -
  identity, version, boot state, SELinux, adb/usb, anti-emulator, plus une passe de
  nettoyage. Les scripts de démarrage l'exécutent. Dans un mode scoped, les groupes identity
  et version sont laissés de côté (Zygisk les livre par processus) ; les groupes boot, lock
  et SELinux restent globaux pour que l'appareil soit cohérent.
- **DRM / Widevine (`motor_drm`).** Hooke les méthodes `MediaDrm` qui rapportent le niveau
  de sécurité Widevine (`getSecurityLevel`, `getPropertyString`) et renvoie le niveau
  configuré. Les hooks sont null-checked, donc un profil malformé se dégrade en douceur au
  lieu de planter l'application. `drm_targets` permet à ce moteur de s'exécuter sur sa propre
  liste d'applications, découplée du scope principal.

## Lecture de la config

Le processus injecté s'exécute dans le domaine SELinux du zygote, qui par défaut ne peut pas
atteindre `/data/adb`. Le module livre son propre `sepolicy.rule` pour l'autoriser, et, en
repli, peut lire la config via son répertoire de module ouvert (`getModuleDir`), de sorte
qu'il continue de fonctionner même si un build de Zygisk cesse d'accorder ce chemin. Le
fichier est parsé avec un petit parseur JSON embarqué (`jsmn`) ; un fichier qui ne se parse
pas signifie que le module ne spoofe rien.

## Garder le profil à jour

`fingerprint-update.sh` rafraîchit les champs build depuis la plus récente image d'usine
Google, depuis la WebUI ou une fois par démarrage. Il utilise le downloader intégré du
module (pas un `curl`/`wget` du `PATH`), valide chaque valeur avant usage, ne revient jamais
en arrière, et refuse un profil qui usurpe un appareil différent. `android.os.Build` est
écrit au démarrage de zygote, donc les nouvelles valeurs atteignent les applications au
prochain redémarrage. Voir [USER-GUIDE.md](USER-GUIDE.md) pour le côté utilisateur et
[CONFIGURATION.md](CONFIGURATION.md) pour les champs.

## Pourquoi la version d'Android n'est pas usurpée par défaut

Augmenter `SDK_INT` / `ANDROID_VERSION` au-delà de ce que le framework de la ROM est
réellement amène les applications à appeler des API qui n'existent pas, ce qui plante les
applications de Google et redémarre le téléphone en softloop. Le groupe version est donc
désactivé par défaut et verrouillé derrière `spoof_version`. Le module lit la version réelle
depuis `/system/build.prop`, jamais depuis `getprop`, parce que `getprop` est exactement ce
qu'il falsifie. Voir le piège dans [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [../CONTRIBUTING.md](CONTRIBUTING.md).*
