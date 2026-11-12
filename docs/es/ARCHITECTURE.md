> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · Español · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arquitectura

COPG-VD es un módulo de Zygisk: una pequeña biblioteca nativa (`libspoof.so`) que el loader
de Zygisk inyecta en el zygote y, desde ahí, en los procesos de las apps. Todo lo que hace es
presentar una identidad de dispositivo elegida a los procesos que seleccionas. No hay app y,
aparte de la obtención opcional del perfil, no hay red.

## Ciclo de vida

1. **Arranque de zygote.** Cuando el zygote arranca, el loader llama a la función `onLoad`
   del módulo. Lee `/data/adb/COPG-VD/COPG-VD.json` una vez: la configuración de alcance y el perfil.
2. **Fork de app.** Para cada app que el zygote forkea, el módulo decide en
   `preAppSpecialize` si este proceso está en el alcance:
   - **en el alcance principal** (`playstore` / `global` / `whitelist` / `blacklist`), o
   - **en el alcance de DRM** (listado en `drm_targets`).
   Si no es ninguno, el módulo se **desacopla** de ese proceso (`dlclose`) y no deja rastro
   en él.
3. **Specialize.** Para un proceso que se queda, los motores se aplican en
   `postAppSpecialize`, mientras el proceso todavía tiene privilegios.

Como los forks heredan la copia copy-on-write de la memoria del zygote, cada app arranca a
partir de la configuración leída en el arranque. El módulo relee el archivo por proceso
objetivo solo cuando realmente ha cambiado, de modo que una app recién iniciada o reabierta
toma un perfil editado - pero la decisión de alcance en sí se toma en el arranque de zygote,
así que **cambiar el alcance, los motores o `drm_targets` requiere un reinicio**.

## Los motores

Cada uno es independiente y conmutable.

- **Campos Build (`motor_jni`).** Reescribe `android.os.Build.*` (y `Build.VERSION.*`) en el
  proceso objetivo mediante JNI, de modo que el código Java lee los valores falsificados.
- **Hook de propiedades (`motor_prop_hook`).** Presenta al proceso las propiedades del
  sistema falsificadas mediante un remapeo clean-room, por proceso, del área de propiedades
  (`prop_virtualizer`). Es un remapeo de memoria, no un hook de función, así que no hay
  huella de función hookeada.
- **resetprop (en todo el dispositivo).** Escribe las propiedades del sistema por grupo -
  identidad, versión, estado de arranque, SELinux, adb/usb, anti-emulador, más una pasada de
  limpieza. Los scripts de arranque lo ejecutan. En un modo con alcance acotado, los grupos
  de identidad y versión quedan fuera (Zygisk los entrega por proceso); los grupos de
  arranque, bloqueo y SELinux permanecen globales para que el dispositivo sea coherente.
- **DRM / Widevine (`motor_drm`).** Hookea los métodos de `MediaDrm` que informan del nivel
  de seguridad Widevine (`getSecurityLevel`, `getPropertyString`) y devuelve el nivel
  configurado. Los hooks tienen comprobación de null, de modo que un perfil malformado se
  degrada con elegancia en lugar de hacer caer la app. `drm_targets` permite que este motor
  se ejecute en su propia lista de apps, desacoplado del alcance principal.

## Lectura de la configuración

El proceso inyectado se ejecuta en el dominio SELinux del zygote, que de forma predeterminada
no puede alcanzar `/data/adb`. El módulo incluye su propio `sepolicy.rule` para permitirlo y,
como alternativa, puede leer la configuración a través de su directorio de módulo abierto
(`getModuleDir`), de modo que sigue funcionando aunque un build de Zygisk deje de conceder la
ruta. El archivo se parsea con un pequeño parser JSON embebido (`jsmn`); un archivo que no se
parsea significa que el módulo no falsifica nada.

## Mantener el perfil fresco

`fingerprint-update.sh` refresca los campos build desde la imagen de fábrica de Google más
reciente, desde la WebUI o una vez por arranque. Usa el propio descargador incluido del
módulo (no un `curl`/`wget` del `PATH`), valida cada valor antes de usarlo, nunca retrocede y
rechaza un perfil que falsifica un dispositivo distinto. `android.os.Build` se escribe en el
arranque de zygote, así que los nuevos valores llegan a las apps en el siguiente reinicio.
Consulta [USER-GUIDE.md](USER-GUIDE.md) para el lado del usuario y
[CONFIGURATION.md](CONFIGURATION.md) para los campos.

## Por qué la versión de Android no se falsifica de forma predeterminada

Subir `SDK_INT` / `ANDROID_VERSION` por encima de lo que realmente es el framework de la ROM
hace que las apps llamen a APIs que no existen, lo que hace caer las apps de Google y
reinicia el teléfono en un softloop. Por eso el grupo de versión está desactivado de forma
predeterminada y protegido tras `spoof_version`. El módulo lee la versión real de
`/system/build.prop`, nunca de `getprop`, porque `getprop` es justo lo que falsifica.
Consulta la trampa en [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Las correcciones y mejoras son bienvenidas - consulta [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Esta documentación se generó con Claude (Anthropic) y la mantiene VD171. Las correcciones y mejoras son bienvenidas; consulta [CONTRIBUTING.md](CONTRIBUTING.md)._
