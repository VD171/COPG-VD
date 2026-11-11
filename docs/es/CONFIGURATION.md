> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · Español · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Referencia de configuración

Todo el módulo se controla con un único archivo: `/data/adb/COPG-VD/COPG-VD.json`. La WebUI lo
escribe por ti, pero puedes editarlo a mano. Un ejemplo incluido está en
`module/COPG-VD.json.example`.
Esta es la única fuente de verdad; la copia bajo el directorio del módulo es solo un valor
predeterminado de solo lectura. Una configuración heredada de una versión anterior en
`/data/adb/COPG-VD.json` se traslada a este directorio automáticamente. El propio
registro y estado del módulo (`update.log`, `update.state`) también viven aquí.

Reglas:

- **Las cadenas usan solo comillas dobles**, como en JSON.
- **Cada campo es opcional.** Un campo que no se proporciona se omite y se conserva el propio
  valor de la ROM.
- Ejecuta **Analyze** después de editar a mano: un archivo que no se parsea hace que el
  módulo falsifique **nada**, y solo logcat lo dice.

## Claves de nivel superior

| Clave | Tipo | Significado |
|---|---|---|
| `scope_mode` | string | `playstore` (predeterminado), `global`, `whitelist` o `blacklist`. Consulta [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Paquetes que reciben el spoof cuando `scope_mode` es `whitelist`. |
| `scope_blacklist` | array | Paquetes excluidos cuando `scope_mode` es `blacklist`. |
| `COPG-VD` | object | El perfil: los campos Build a presentar (ver abajo). |
| `COPG-VD-Delete` | array | Nombres de campos a eliminar en lugar de establecer (el campo Build pasa a ser null; una propiedad se elimina con `resetprop --delete`). |
| `COPG-VD-Settings` | object | Ajustes del módulo que viajan con el perfil (ver abajo). |
| `motor_jni` | bool | Motor de campos Build (reescribe `android.os.Build.*`). Predeterminado `true`. |
| `motor_prop_hook` | bool | Motor de propiedades por proceso (remapeo clean-room de propiedades). Predeterminado `true`. |
| `motor_drm` | bool | Motor de DRM / Widevine. Predeterminado `false`. |
| `drm_targets` | array | Apps que reciben el spoof de DRM independientemente de `scope_mode`. Vacío = seguir el alcance. |
| `global_fields` | array | Campos Build aplicados en todo el dispositivo incluso en un modo con alcance acotado, solo para campos seguros en cuanto a coherencia. |
| `process_overrides` | object | Sobrescrituras de campos por proceso: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Detalle extra de logcat para depurar. Predeterminado `false`. |

## El objeto de perfil `COPG-VD`

Cada entrada es un campo de dispositivo presentado a los procesos objetivo. Los comunes:

| Grupo | Campos |
|---|---|
| Identidad | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| ID del build | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Atestación | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Versión (especial) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Las variantes `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) permiten
que la ruta de atestación informe de un valor distinto del valor simple, de modo que el
keystore se mantenga coherente.

> **El grupo de versión es especial.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` y `CODENAME`
> describen tu ROM, no el dispositivo falsificado. Subirlos mete el teléfono en un softloop.
> No están en el perfil incluido y solo se aplican cuando `COPG-VD-Settings.spoof_version` lo
> permite - consulta [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Estados de campo

| Estado | Cómo | Resultado |
|---|---|---|
| Establecer | `"KEY": "value"` | Escribe el valor. |
| Vacío | `"KEY": ""` | Escribe un valor vacío. |
| Eliminar | nombre en `"COPG-VD-Delete": [ ... ]` | Elimina el campo. |
| Omitir | dejar la clave fuera | Conserva el propio valor de la ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` o `L3`) es el nivel de Widevine informado cuando `motor_drm` está
activado.

## `COPG-VD-Settings`

Ajustes que viajan con el perfil, de modo que una copia de seguridad lleva tus decisiones.

| Clave | Tipo / valores | Significado |
|---|---|---|
| `resetprop` | bool | Si se ejecuta el motor resetprop en todo el dispositivo. |
| `autoupdate` | bool | Si `fingerprint-update.sh` se ejecuta una vez por arranque. Activado de forma predeterminada. |
| `spoof_manufacturer` | bool | Si el campo de fabricante también se falsifica. |
| `spoof_version` | `never` / `rom` / `force` | Cómo se aplica el grupo de versión de Android. `never` es el predeterminado; `force` se rechaza al restaurar una copia de seguridad. |

## `global_fields`

Los campos Build de esta lista se aplican en todo el dispositivo incluso en un modo con
alcance acotado, para mantener un valor consistente en todas partes. Úsalo solo para campos
seguros en cuanto a coherencia - el parche de seguridad es el habitual. **Nunca** pongas aquí
la identidad ni el grupo de versión de Android.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Ejemplo

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

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Las correcciones y mejoras son bienvenidas - consulta [../CONTRIBUTING.md](CONTRIBUTING.md).*
