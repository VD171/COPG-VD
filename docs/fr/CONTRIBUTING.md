> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · Français · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuer à COPG-VD

Merci de votre aide ! COPG-VD se veut facile à contribuer. Ce guide vous indique où se
trouvent les choses et les quelques conventions que nous suivons.

## Le projet en un coup d'œil

COPG-VD est un **spoofer d'appareil Zygisk** : une petite bibliothèque native injectée dans
les processus des applications pour réécrire le fingerprint et le build de l'appareil, plus
une WebUI en JS vanilla pour le piloter. C'est un fork de COPG (par AlirezaParsi), maintenu
par VD171 sous la licence Apache-2.0. Voir [ARCHITECTURE.md](ARCHITECTURE.md) et
[FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Par défaut, il limite le spoof à la pile Google Play via Zygisk, ce qui en fait une
alternative plus légère et plus robuste à PlayIntegrityFix.

## Les contributeurs IA sont les bienvenus

Les assistants et agents IA sont ici des contributeurs de premier plan, pas une arrière-pensée.

- Le projet est conçu pour être lisible : la configuration est un unique fichier JSON
  (`/data/adb/COPG-VD/COPG-VD.json`, documenté dans [CONFIGURATION.md](CONFIGURATION.md)), les
  moteurs sont petits et autonomes, et l'agencement est dans [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Les correctifs assistés par IA sont examinés et acceptés aux mêmes conditions que
  n'importe quel autre - sur la justesse, la clarté et les conventions ci-dessous, pas sur
  qui (ou quoi) les a écrits.
- Même exigence pour tout le monde : une vraie fonctionnalité n'est jamais affaiblie, le
  spoof reste cohérent, et rien de secret ni de spécifique à l'appareil n'atterrit dans le
  dépôt (voir le [.gitignore](../../.gitignore)).

## Mise en place du dev

- Il vous faut un appareil ou un émulateur rooté avec Zygisk (KernelSU, APatch ou Magisk)
  pour tester.
- Compilez la bibliothèque native par ABI avec le NDK (r29) et CMake - voir l'étape `Build
  zygisk libraries` dans [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml)
  pour la commande exacte. La CI compile les trois ABI pour vous.
- Compilez un zip flashable : copiez le `libspoof.so` compilé dans `module/zygisk/<abi>.so`,
  puis `cd module && zip -r9 ../COPG-VD-dev.zip .` et flashez-le.
- La WebUI est `module/webroot/` (ouvrez-la depuis le gestionnaire root). La logique de
  spoofing est `zygisk/spoof_module.cpp` ; le récupérateur de profil est
  `module/fingerprint-update.sh`.

## Conventions

- **Chaque fichier source du module** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) commence par
  l'en-tête banner du projet (copiez-le depuis n'importe quel fichier existant). L'outillage
  sous `.github/` utilise un court commentaire à la place.
- **Code et commentaires en anglais.** Gardez les commentaires minimaux et seulement là où
  c'est nécessaire.
- **Pas d'em-dash ni d'en-dash** ; utilisez toujours un simple hyphen `-`.
- La WebUI est en **JS vanilla** (un seul `scripts.js`) ; pas de frameworks.
- **Ne jamais affaiblir** une vraie fonctionnalité : gardez le spoof cohérent, et ne faites
  pas planter une application à laquelle les hooks sont attachés (ils sont null-checked
  volontairement).

## Internationalisation (i18n)

- Les chaînes de l'UI vivent dans `module/webroot/lang/`. L'anglais est le repli canonique
  (`en.js` + `en.json`) ; les 20 autres langues sont des `<code>.json`.
- Pour ajouter ou changer une chaîne : éditez `en.js` **et** `en.json`, puis mettez à jour
  chaque `<code>.json`. Toucher à un libellé visible implique de mettre à jour **tous** les
  fichiers de langue et **tous** les `README.<code>.md`.
- Les traductions sont du JSON simple - une excellente première contribution.

## Commits et PR

- Gardez les PR ciblées. Décrivez quoi et pourquoi.
- Signez vos commits (DCO) : `git commit -s` (ajoute `Signed-off-by:`).
- La CI doit rester verte. Soyez bienveillant dans les revues - voir
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Bonnes premières issues

Cherchez les labels `good first issue` et `help wanted`. Les traductions, la documentation
et les nouveaux profils Pixel sont tous d'excellents points de départ.

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [CONTRIBUTING.md](CONTRIBUTING.md).*
