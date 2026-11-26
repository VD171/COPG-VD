> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · Français · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Agents IA : la surface de contrôle

COPG-VD accueille les contributeurs IA et agents, et tout le module est conçu pour être piloté sans
interface, sans scraper la WebUI. Il y a deux surfaces, et un agent s'exécutant en root (comme le fait la
WebUI) utilise les deux :

1. **Le fichier de configuration** `/data/adb/COPG-VD/COPG-VD.json` - l'unique source de vérité. Chaque
   champ de profil et chaque réglage y réside, lire et écrire ce fichier est la façon de changer ce que le
   module usurpe.
2. **Le point d'entrée shell** `fingerprint-update.sh` - un seul script avec des verbes stables pour
   vérifier, appliquer et récupérer des profils.

## Le fichier de configuration

`/data/adb/COPG-VD/COPG-VD.json` est un simple objet JSON. Le module le lit depuis les processus injectés
via une règle SELinux dédiée qu'il livre lui-même, il ne contient aucun identifiant. Un exemple livré se
trouve dans `module/COPG-VD.json.example`, rafraîchi quotidiennement à partir de la dernière image d'usine
Google.

Règles qu'un agent doit suivre :

- **Les chaînes utilisent uniquement des guillemets doubles**, comme en JSON.
- **Chaque champ est optionnel.** Un champ qui n'est pas fourni est ignoré et la valeur propre de la ROM
  est conservée.
- Les clés de premier niveau qui pilotent le module sont `scope_mode`, `scope_whitelist`,
  `scope_blacklist`, `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, l'objet `COPG-VD`
  (les champs Build), une liste `COPG-VD-Delete` et un objet `COPG-VD-Settings` (`resetprop`, `autoupdate`,
  `spoof_version`). La [référence de configuration](CONFIGURATION.md) documente chacune d'elles.
- `"spoof_version": "force"` est refusé lorsqu'il provient du fichier sur le disque et est rétrogradé à la
  lecture, de sorte que restaurer une ancienne sauvegarde ne puisse pas le réarmer en silence. Définissez
  la politique de version via les réglages, pas en écrivant `force` à la main.
- Après avoir édité le fichier, exécutez **`analyze`** (ci-dessous) : un fichier qui ne se parse pas fait
  que le module n'usurpe **rien**, et seul logcat le signale.

Une config modifiée atteint les applications au prochain démarrage de processus. Les propriétés livrées par
`resetprop` peuvent être réappliquées sans redémarrage (`service.sh --props-only`), mais les champs
`android.os.Build.*` sont écrits par la bibliothèque Zygisk au démarrage de zygote, donc **un redémarrage
est requis** pour que ceux-ci atteignent les applications.

## Le contrat shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Le script affiche des lignes lisibles par un humain, les lignes lisibles par une machine commencent par
`status:`. Son code de sortie est `0` en cas de succès et non nul en cas d'échec.

| Verbe | Ce qu'il fait | Sortie typique |
|---|---|---|
| `check` | Compare le profil installé au dernier build amont, n'écrit rien. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Récupère le profil le plus récent et le fusionne dans la config (champs Build uniquement, vos autres clés sont préservées). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Audite la config telle qu'elle est (parse, version vs ROM, cohérence du fingerprint, clés inconnues, dates, props). Affiche un rapport, le code de sortie reflète les constats red/warn. | un rapport texte |
| `fetch-index` | Télécharge et vérifie l'index de dispositifs signé et l'affiche (`index.json`). | le JSON de l'index \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Télécharge le `build.prop` d'un dispositif (chemin issu de l'index, par ex. `pixel-9a/latest.prop`) et écrit ses champs Build dans la config. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migre l'état/la config de l'ancienne disposition à plat vers `/data/adb/COPG-VD/`. | - |
| `migrate` | Migration ponctuelle de la config entre versions du module. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | L'auto-mise à jour une fois par démarrage, destinée à `service.sh`, pas à un usage interactif. | écrit `update.status` |

Chaque téléchargement est validé avant usage (le seul téléchargeur sur l'appareil est le `wget` de busybox,
qui ne peut pas valider le TLS), et le programme de mise à jour de profil ne revient jamais en arrière : un
build amont plus ancien que celui installé est refusé. L'index du flux et chaque `.prop` portent une
signature ed25519 détachée qui est vérifiée avant que le contenu ne soit lu.

## Flux d'agent typiques

- **Garder le profil à jour :** `check`; si `status: update-available`, `apply`; puis redémarrez pour
  que les nouveaux `Build.*` atteignent les applications.
- **Passer à un autre profil Pixel :** `fetch-index`, choisissez un chemin de dispositif dans l'index,
  `fetch <path>`, exécutez `analyze` pour confirmer que la config est cohérente, puis redémarrez.
- **Changer la portée ou un engine :** éditez `scope_mode` (ou un interrupteur d'engine) dans le fichier de
  configuration, exécutez `analyze`, puis `service.sh --props-only` pour les changements livrés par
  propriété, ou redémarrez pour les champs Build.

## Garde-fous

- Changer la config ou appliquer un profil change ce que voit chaque application ciblée, confirmez
  l'intention avant d'écrire, comme le fait la WebUI.
- Ne jamais relâcher une garde de cohérence réelle : le SDK est plafonné au framework réel sous toutes les
  politiques, le fabricant reste en accord avec le reste du profil, et un profil destiné à un autre
  dispositif est refusé. Ce sont des choix délibérés qui ne doivent pas être contournés.
- La config est la surface supportée. Ne scrapez pas et n'automatisez pas la WebUI elle-même.

<!-- doc-footer -->

---

> _Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues, voir [CONTRIBUTING.md](CONTRIBUTING.md)._
