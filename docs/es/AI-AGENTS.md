> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · Español · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Agentes de IA: la superficie de control

COPG-VD da la bienvenida a los colaboradores de IA y de agentes, y todo el módulo está construido para ser
gobernado sin interfaz, sin hacer scraping de la WebUI. Hay dos superficies, y un agente que se ejecuta como
root (como lo hace la WebUI) usa ambas:

1. **El archivo de configuración** `/data/adb/COPG-VD/COPG-VD.json` - la única fuente de verdad. Cada campo
   de perfil y cada ajuste vive aquí; leer y escribir este archivo es como cambias lo que el módulo spoofea.
2. **El punto de entrada de shell** `fingerprint-update.sh` - un único script con verbos estables para
   comprobar, aplicar y obtener perfiles.

## El archivo de configuración

`/data/adb/COPG-VD/COPG-VD.json` es un objeto JSON plano. El módulo lo lee desde los procesos inyectados a
través de una regla SELinux dedicada que él mismo incluye; no contiene credenciales. Un ejemplo incluido
vive en `module/COPG-VD.json.example`, actualizado a diario desde la imagen de fábrica de Google más
reciente.

Reglas que un agente debe seguir:

- **Los strings usan solo comillas dobles**, como en JSON.
- **Cada campo es opcional.** Un campo que no se proporciona se omite y se conserva el valor propio de la
  ROM.
- Las claves de nivel superior que gobiernan el módulo son `scope_mode`, `scope_whitelist`,
  `scope_blacklist`, `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, el objeto `COPG-VD`
  (los campos de Build), una lista `COPG-VD-Delete` y un objeto `COPG-VD-Settings` (`resetprop`,
  `autoupdate`, `spoof_version`). La [Referencia de configuración](CONFIGURATION.md) documenta cada una.
- `"spoof_version": "force"` se rechaza cuando proviene del archivo en disco y se degrada al leerlo, de modo
  que restaurar un backup antiguo no pueda rearmarlo en silencio. Define la política de versión a través de
  los ajustes, no escribiendo `force` a mano.
- Después de editar el archivo, ejecuta **`analyze`** (abajo): un archivo que no se parsea hace que el módulo
  no spoofee **nada**, y solo logcat lo dice.

Una configuración modificada llega a las apps en el siguiente arranque de proceso. Las propiedades entregadas
por `resetprop` se pueden reaplicar sin reiniciar (`service.sh --props-only`), pero los campos
`android.os.Build.*` los escribe la biblioteca Zygisk cuando zygote arranca, así que **se requiere un
reinicio** para que estos lleguen a las apps.

## El contrato de shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

El script imprime líneas legibles por humanos; las legibles por máquina empiezan con `status:`. Su código de
salida es `0` en caso de éxito y distinto de cero en caso de fallo.

| Verbo | Qué hace | Salida típica |
|---|---|---|
| `check` | Compara el perfil instalado con el build upstream más reciente, no escribe nada. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Obtiene el perfil más reciente y lo fusiona en la configuración (solo campos de build; tus otras claves se conservan). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Audita la configuración tal como está (parseo, versión vs. ROM, coherencia del fingerprint, claves desconocidas, fechas, props). Imprime un informe; el código de salida refleja los hallazgos rojos/de advertencia. | un informe de texto |
| `fetch-index` | Descarga y verifica el índice de dispositivos firmado y lo imprime (`index.json`). | el JSON del índice \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Descarga la `build.prop` de un dispositivo (ruta del índice, p. ej. `pixel-9a/latest.prop`) y escribe sus campos de build en la configuración. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migra el estado/configuración del antiguo layout plano a `/data/adb/COPG-VD/`. | - |
| `migrate` | Migración puntual de la configuración entre versiones del módulo. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | El auto-update de una vez por arranque; pensado para `service.sh`, no para uso interactivo. | escribe `update.status` |

Cada descarga se valida antes de usarse (el único descargador en el dispositivo es busybox `wget`, que no
puede validar TLS), y el actualizador de perfiles nunca retrocede: un build upstream más antiguo que el
instalado es rechazado. El índice del feed y cada `.prop` llevan una firma ed25519 separada que se verifica
antes de leer el contenido.

## Flujos típicos de agente

- **Mantener el perfil fresco:** `check`; si `status: update-available`, `apply`; luego reinicia para que
  los nuevos `Build.*` lleguen a las apps.
- **Cambiar a otro perfil Pixel:** `fetch-index`, elige una ruta de dispositivo del índice, `fetch <path>`,
  ejecuta `analyze` para confirmar que la configuración es coherente, luego reinicia.
- **Cambiar el scope o un engine:** edita `scope_mode` (o un interruptor de engine) en el archivo de
  configuración, ejecuta `analyze`, luego `service.sh --props-only` para los cambios entregados por
  propiedad, o reinicia para los campos de Build.

## Barandillas de seguridad

- Cambiar la configuración o aplicar un perfil cambia lo que ve cada app objetivo; confirma la intención
  antes de escribir, como lo hace la WebUI.
- Nunca aflojes una guarda de coherencia real: el SDK está limitado al framework real bajo cualquier
  política, el fabricante se mantiene al paso con el resto del perfil, y un perfil de otro dispositivo es
  rechazado. Son deliberadas y no deben eludirse.
- La configuración es la superficie soportada. No hagas scraping ni automatices la WebUI en sí.

<!-- doc-footer -->

---

> _Esta documentación se generó con Claude (Anthropic) y la mantiene VD171. Las correcciones y mejoras son bienvenidas; consulta [CONTRIBUTING.md](CONTRIBUTING.md)._
