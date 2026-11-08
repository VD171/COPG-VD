> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · Español · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Guía del usuario

COPG-VD reescribe la huella del dispositivo y el build para que las apps que elijas vean
un Pixel en lugar de tu dispositivo real. Esta guía te lleva desde la instalación hasta una
configuración funcional, y a través de las decisiones del camino. Para cada campo y valor,
consulta [CONFIGURATION.md](CONFIGURATION.md); para saber cómo funciona por dentro, consulta
[ARCHITECTURE.md](ARCHITECTURE.md).

## Instalación

1. Flashea el zip en KernelSU, APatch o Magisk y reinicia.
2. Zygisk debe estar activo (integrado, o ReZygisk / Zygisk Next). Usuarios de Magisk: activad Zygisk.
3. El módulo incluye un perfil de Pixel, así que justo después del reinicio el stack de
   Google Play ya ve ese Pixel. Con una huella funcional no necesitas PlayIntegrityFix ni
   GooglePhotosUnlimited.

Abre la WebUI desde tu gestor de root para controlar el módulo. Los usuarios de Magisk la
abren con [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Todo
también puede editarse directamente en `/data/adb/COPG-VD.json`.

## Quién ve el spoof (alcance)

`scope_mode` decide qué procesos reciben la identidad falsificada. En un modo con alcance
acotado, la identidad se entrega por proceso mediante Zygisk y **no** se filtra al resto del
sistema a través de propiedades globales.

| Modo | Quién recibe el spoof |
|---|---|
| `playstore` (predeterminado) | Solo el stack de Play: Google Play services, su proceso inestable y la Play Store. |
| `global` | Todo el dispositivo: cada proceso. |
| `whitelist` | Solo las apps listadas en `scope_whitelist`. |
| `blacklist` | Cada app excepto las de `scope_blacklist`. |

Empieza con `playstore`. Es la opción más ligera y la que pasa Play Integrity sin exponer
el spoof a apps no relacionadas.

## Los motores

Cada motor es independiente y se puede apagar. Todos están activados de forma predeterminada
excepto DRM.

- **Campos Build (`motor_jni`)** - reescribe `android.os.Build.*` en los procesos objetivo.
  Esto es lo que leen la mayoría de las apps.
- **Hook de propiedades (`motor_prop_hook`)** - presenta las propiedades del sistema
  falsificadas a los procesos objetivo, mediante un remapeo clean-room por proceso del área
  de propiedades (sin hook de función).
- **resetprop** - reescribe las propiedades del sistema en todo el dispositivo, por grupo
  (identidad, versión, estado de arranque, SELinux, adb/usb, anti-emulador y una pasada de
  limpieza). En un modo con alcance acotado, los grupos de identidad y versión quedan fuera
  de la pasada en todo el dispositivo (Zygisk los entrega por proceso); los grupos de
  arranque, bloqueo y SELinux permanecen globales. Actívalo o desactívalo en
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, desactivado de forma predeterminada)** - informa de un
  nivel de seguridad Widevine elegido (L1 o L3) a las apps que lo leen. Consulta la sección
  de DRM más abajo.

## Mantener la huella fresca

Una huella envejece: Google rota las imágenes de fábrica, y una antigua pierde valor poco a
poco. `fingerprint-update.sh` mantiene la tuya actualizada, desde la imagen de fábrica de
Google más reciente.

- Desde la WebUI (pestaña Tools): **Check Update** y **Update Now**.
- Por sí solo, **una vez por arranque**: **Auto-update JSON on boot** (activado de forma
  predeterminada). Se ejecuta en segundo plano, sigue reintentando durante unos diez
  minutos porque el wifi normalmente aún no está disponible en el arranque, y nunca retrasa
  el arranque.
- Solo reescribe los campos build (fingerprint, ID, incremental, timestamp, parche de
  seguridad, SDK, UUID, host, user). Todo lo que personalizaste se conserva, y el contenido
  anterior se guarda como `.bak`.
- Nunca retrocede (un build de upstream más antiguo se rechaza), y si tu perfil falsifica un
  dispositivo distinto no aplica nada - una huella de Pixel en otro perfil es peor que una
  antigua.
- `resetprop` se vuelve a aplicar justo después de una actualización, pero
  `android.os.Build` se escribe cuando arranca zygote, así que **reinicia** para que los
  nuevos valores lleguen a las apps. Log: `/data/adb/COPG-VD.update.log`.

## La trampa de la versión de Android

Lo más difícil de acertar. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` y `CODENAME` describen
**tu ROM**, no el dispositivo que falsificas. Decirle a las apps que el SDK es más nuevo de
lo que realmente es el framework hace que llamen a APIs que no existen: las apps de Google se
caen, el teléfono se reinicia y empieza de nuevo. El arranque en sí se completa, así que es
un **softloop** que no deja nada en los logs de arranque.

Estos campos no están en la configuración incluida y el actualizador nunca los escribe.
**Spoof Android version** (`COPG-VD-Settings.spoof_version`) decide si se aplican siquiera:

- `never` (predeterminado) - se usa la propia versión de la ROM.
- `rom` - aplica solo lo que no excede la ROM, lo que en la práctica significa bajar el SDK.
- `force` - aplica exactamente lo que dice la configuración. Esto es lo que causa el
  softloop; úsalo solo si sabes que el framework objetivo lo soporta.

La versión real se lee de `/system/build.prop`, nunca de `getprop` (que es justo lo que este
módulo falsifica). `force` también se rechaza al restaurar una copia de seguridad, de modo
que una copia antigua no puede volver a armarlo a tus espaldas.

## DRM / Widevine

Desactivado de forma predeterminada (`motor_drm`). Cuando está activado, informa de un nivel
Widevine elegido, `DRM_SECURITY_LEVEL` (`L1` o `L3`), a las apps que lo leen.

De forma predeterminada el spoof de DRM sigue a `scope_mode`. Para aplicarlo en cambio a un
conjunto específico de apps - independientemente del alcance principal - lístalas en
`drm_targets`. El módulo entonces permanece cargado en una app listada **solo** para el hook
de DRM, incluso cuando esa app está fuera del alcance principal; una lista vacía o ausente
significa seguir el alcance. Esto necesita un modo con alcance acotado (no `global`) y surte
efecto en el siguiente **reinicio**.

## Analyze: comprueba tu configuración

**Analyze** en la WebUI (o `fingerprint-update.sh analyze`) audita la configuración tal como
está y te dice qué está mal antes de que lo haga una app:

- la versión frente a la ROM (¿causaría un softloop?),
- si el archivo aún se parsea (uno roto hace que el módulo falsifique **nada**, y solo
  logcat lo diría),
- si la huella concuerda con los campos a su alrededor,
- claves que el módulo no lee, fechas sospechosas, y si las propiedades activas ya llevan lo
  que pide la configuración.

Ejecútalo siempre que edites la configuración a mano.

## La WebUI

Opcional, pero la forma fácil de controlar todo. Cinco pestañas:

- **About** - información del módulo y la versión.
- **Device** - cada campo build, establecido por estado y agrupado por categoría.
- **Spoofing** - el modo de alcance y los interruptores de los motores.
- **System** - los grupos de resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, la autoactualización en el
  arranque, y el informe Diagnostics (un botón para leer y exportar todo lo útil para un
  reporte de error).

No hace ninguna petición de red; todo lo que necesita viene dentro del módulo.

## Solución de problemas

- **Una app sigue viendo el dispositivo real.** Comprueba el alcance: en `playstore` solo
  está cubierto el stack de Play. Confirma que la configuración se parsea (ejecuta Analyze).
  Después de cambiar los motores, `drm_targets` o el perfil, **reinicia** - Zygisk lee el
  alcance cuando arranca zygote.
- **Play Integrity sigue fallando.** Asegúrate de que la huella está fresca (Check Update) y
  de que el `SECURITY_PATCH` está en `global_fields` para que se mantenga coherente en todo
  el dispositivo. Mata Google Play services para que vuelva a atestiguar.
- **El teléfono entra en softloop tras activar el spoof de versión.** Esa es la trampa de la
  versión de Android de arriba - vuelve a poner `spoof_version` en `never`.
- **La WebUI no se abre en Magisk.** Usa [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Las correcciones y mejoras son bienvenidas - consulta [../CONTRIBUTING.md](CONTRIBUTING.md).*
