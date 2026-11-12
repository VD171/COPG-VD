> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · Français · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Référence de configuration

Tout le module est piloté par un seul fichier : `/data/adb/COPG-VD/COPG-VD.json`. La WebUI l'écrit
pour vous, mais vous pouvez l'éditer à la main. Un exemple livré se trouve à
`module/COPG-VD.json.example`.
Il s'agit de la source unique de vérité ; la copie sous le répertoire du module n'est qu'une valeur par défaut en lecture seule. Une config laissée par une version plus ancienne à `/data/adb/COPG-VD.json` est déplacée automatiquement dans ce répertoire. Le journal et l'état propres au module (`update.log`, `update.state`) résident ici aussi.

Règles :

- **Les chaînes utilisent uniquement des guillemets doubles**, comme en JSON.
- **Chaque champ est optionnel.** Un champ qui n'est pas fourni est ignoré et la valeur
  propre de la ROM est conservée.
- Lancez **Analyze** après une édition à la main : un fichier qui ne se parse pas fait que
  le module ne spoofe **rien**, et seul logcat le dit.

## Clés de premier niveau

| Clé | Type | Signification |
|---|---|---|
| `scope_mode` | string | `playstore` (par défaut), `global`, `whitelist` ou `blacklist`. Voir [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Paquets qui reçoivent le spoof quand `scope_mode` est `whitelist`. |
| `scope_blacklist` | array | Paquets exclus quand `scope_mode` est `blacklist`. |
| `COPG-VD` | object | Le profil : les champs Build à présenter (voir ci-dessous). |
| `COPG-VD-Delete` | array | Noms de champs à retirer au lieu de définir (le champ Build devient null ; une propriété est retirée avec `resetprop --delete`). |
| `COPG-VD-Settings` | object | Réglages du module qui voyagent avec le profil (voir ci-dessous). |
| `motor_jni` | bool | Moteur des champs Build (réécrit `android.os.Build.*`). Par défaut `true`. |
| `motor_prop_hook` | bool | Moteur de propriétés par processus (remap clean-room des propriétés). Par défaut `true`. |
| `motor_drm` | bool | Moteur DRM / Widevine. Par défaut `false`. |
| `drm_targets` | array | Applications qui reçoivent le spoof DRM indépendamment de `scope_mode`. Vide = suivre le scope. |
| `global_fields` | array | Champs Build appliqués à l'échelle de l'appareil même en mode scoped, pour les champs sûrs côté cohérence uniquement. |
| `process_overrides` | object | Surcharges de champs par processus : `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Détail logcat supplémentaire pour le débogage. Par défaut `false`. |

## L'objet profil `COPG-VD`

Chaque entrée est un champ d'appareil présenté aux processus ciblés. Les plus courants :

| Groupe | Champs |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (spécial) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Les variantes `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) permettent
au chemin d'attestation de rapporter une valeur différente de la valeur ordinaire, pour que
le keystore reste cohérent.

> **Le groupe version est spécial.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` et `CODENAME`
> décrivent votre ROM, pas l'appareil usurpé. Les augmenter fait faire un softloop au
> téléphone. Ils ne sont pas dans le profil livré et ne s'appliquent que lorsque
> `COPG-VD-Settings.spoof_version` l'autorise - voir
> [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### États de champ

| État | Comment | Résultat |
|---|---|---|
| Set | `"KEY": "value"` | Écrit la valeur. |
| Empty | `"KEY": ""` | Écrit une valeur vide. |
| Delete | nom dans `"COPG-VD-Delete": [ ... ]` | Retire le champ. |
| Skip | laisser la clé de côté | Conserve la valeur propre de la ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` ou `L3`) est le niveau Widevine rapporté quand `motor_drm` est activé.

## `COPG-VD-Settings`

Réglages qui voyagent avec le profil, pour qu'une sauvegarde emporte vos choix.

| Clé | Type / valeurs | Signification |
|---|---|---|
| `resetprop` | bool | Si le moteur resetprop à l'échelle de l'appareil s'exécute. |
| `autoupdate` | bool | Si `fingerprint-update.sh` s'exécute une fois par démarrage. Activé par défaut. |
| `spoof_manufacturer` | bool | Si le champ manufacturer est usurpé également. |
| `spoof_version` | `never` / `rom` / `force` | Comment le groupe version d'Android s'applique. `never` est le défaut ; `force` est refusé lors de la restauration d'une sauvegarde. |

## `global_fields`

Les champs Build dans cette liste sont appliqués à l'échelle de l'appareil même en mode
scoped, pour garder une valeur cohérente partout. Ne l'utilisez que pour les champs sûrs
côté cohérence - le security patch est le cas habituel. **Ne jamais** mettre l'identity ou
le groupe version d'Android ici.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Exemple

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues ; voir [CONTRIBUTING.md](CONTRIBUTING.md)._
