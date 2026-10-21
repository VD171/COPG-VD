## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD es un spoofer de dispositivo: reescribe el fingerprint y el build del dispositivo para que las apps vean el dispositivo que elijas en lugar del real.  
Se ejecuta sobre Zygisk (KernelSU, APatch o Magisk) y, por defecto, limita el spoofing a la pila de Google Play - por lo que es una alternativa más ligera y robusta a PlayIntegrityFix.  

## Capturas de pantalla

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## ¿Cómo se usa?
Instala el módulo, reinicia, y el perfil incluido (un Pixel) se spoofea a las apps objetivo. Con un fingerprint que funcione no necesitas PlayIntegrityFix ni GooglePhotosUnlimited.  
Todo se configura en `/data/adb/COPG-VD.json`, o desde la WebUI. Todos los campos son OPCIONALES - un campo que no se proporciona se omite.  

### Scope - quién ve el spoofing
`scope_mode` decide qué procesos reciben la identidad spoofeada. En un modo acotado, Zygisk entrega la identidad por proceso y no se filtra al resto del sistema a través de las propiedades globales.  
* **Google Play** (`playstore`, el predeterminado) - solo la pila de Play (Google Play services, su proceso unstable y la Play Store).  
* **Global** - todo el dispositivo; todos los procesos la ven.  
* **Whitelist** - solo las apps en `scope_whitelist`.  
* **Blacklist** - todas las apps excepto las que están en `scope_blacklist`.  

### Engines - cómo se entrega el spoofing
Cada uno es independiente y puede desactivarse:  
* **Build fields (JNI)** - reescribe `android.os.Build.*` en los procesos objetivo.  
* **Property hook** - presenta las propiedades del sistema spoofeadas a los procesos objetivo (un remapeo limpio del área de propiedades por proceso, sin hook de función).  
* **resetprop** - reescribe las propiedades del sistema, gestionadas por grupo: identidad, versión, estado de arranque, SELinux, adb/usb, anti-emulador y una pasada de limpieza. En un modo acotado, los grupos de identidad y versión quedan fuera del resetprop a nivel de dispositivo (Zygisk los entrega por proceso); los grupos de boot/lock/SELinux permanecen globales.  
* **DRM / Widevine** (desactivado por defecto) - informa un nivel de seguridad Widevine elegido, L1 o L3, a las apps que lo leen.  

### Fields - establecer, vaciar, eliminar u omitir
Dentro del objeto `COPG-VD` cada campo de Build tiene cuatro estados:  
* **Set** - `"KEY": "value"` escribe el valor.  
* **Empty** - `"KEY": ""` escribe un valor vacío.  
* **Delete** - lista la clave en un `"COPG-VD-Delete": [ ... ]` de nivel superior para eliminarla (un campo de Build pasa a null, una propiedad se elimina con `resetprop --delete`).  
* **Skip** - deja la clave fuera por completo; se conserva el valor propio de la ROM.  

Una lista `"global_fields": [ ... ]` aplica los campos de Build indicados a nivel de dispositivo incluso en un modo acotado, para mantener un valor consistente en todas partes - solo para campos seguros en cuanto a coherencia (el security patch, por ejemplo), nunca la identidad y nunca el grupo de versión de Android.  

### Ejemplo de archivo de configuración JSON
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
Asegúrate de usar strings solo entre comillas dobles.  
El bloque de arriba y `module/COPG-VD.json.example` se actualizan a diario mediante el workflow [Update COPG-VD.json](.github/workflows/update-json.yml), directamente desde la imagen de fábrica más reciente de Google.  

### Mantener el fingerprint actualizado
`fingerprint-update.sh` descarga ese archivo y actualiza tu configuración, desde la WebUI (**Check Update** / **Update Now**) o por sí mismo **una vez por arranque** (**Auto-update JSON on boot**, activado por defecto).  
* Tanto `/data/adb/COPG-VD.json` como `/data/adb/modules/COPG-VD/COPG-VD.json` se actualizan cuando ambos existen, y el contenido anterior se conserva como `.bak`.  
* Solo se reescriben los campos de build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Todo lo demás que personalizaste se conserva: claves adicionales, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, otros objetos, el orden de las claves y el formato.  
* Nunca retrocede: un build upstream más antiguo que el instalado es rechazado. Esto es
  rutinario (el repo puede quedar por detrás de una configuración que actualizaste a mano) y es también la protección que
  más importa en Android, donde el único descargador disponible es busybox `wget`, que no puede
  validar certificados TLS - por esa misma razón cada valor se valida antes de usarse.  
* Si tu perfil spoofea **otro dispositivo** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` distintos), no se aplica nada - un fingerprint de Pixel en otro perfil es peor que un fingerprint antiguo.  
* En el arranque se ejecuta en segundo plano y sigue reintentando durante ~10 minutos, porque el wifi normalmente aún no está levantado cuando termina el arranque. Nunca retrasa el arranque.  
* `resetprop` se vuelve a aplicar justo después de una actualización, pero `android.os.Build` lo escribe el módulo zygisk cuando zygote arranca: **reinicia** para que los nuevos valores lleguen a las apps.  
* Log en `/data/adb/COPG-VD.update.log`.  

### Versión de Android - y por qué no se spoofea
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` y `CODENAME` describen **tu ROM**, no el dispositivo que se spoofea. Decirles a las apps que el SDK es más nuevo de lo que realmente es el framework hace que llamen a APIs que no existen: las apps de Google se bloquean, el teléfono se reinicia y vuelve a empezar. El arranque en sí se completa, así que es un **softloop** y no aparece nada en los logs de arranque.  
* No están en la configuración que se entrega y el actualizador nunca los escribe.  
* **Spoof Android version** en la WebUI decide si se aplican siquiera:  
  * **Never** (por defecto) - se usa la propia versión de la ROM.  
  * **Up to this ROM** - solo lo que no la excede, lo que en la práctica significa rebajar el SDK.  
  * **Force** - exactamente lo que dice la configuración. Esto es lo que causa el softloop.  
* La versión real se lee de `/system/build.prop`, nunca de `getprop` - que es justo lo que este módulo falsifica.  

### Analyze
**Analyze** en la WebUI (o `fingerprint-update.sh analyze`) audita la configuración tal como está: la versión frente a la ROM, si el archivo todavía se puede parsear (uno roto hace que el módulo no spoofee **nada**, y solo logcat lo dice), si el fingerprint concuerda con los campos que lo rodean, claves que el módulo no lee, fechas, y si las props ya contienen lo que la configuración pide.  

### WebUI
La WebUI es opcional - todo se puede editar directamente en la configuración JSON - pero es la forma fácil de manejar el módulo. Tiene cinco pestañas: **About**, **Device** (cada campo, establecido por estado, agrupado por categoría), **Spoofing** (scope y engines), **System** (los grupos de resetprop) y **Tools** (Analyze, Check Update, Update Now, Backup/Restore y el auto-update en el arranque). No hace ninguna petición de red; todo lo que necesita viene dentro del módulo.  
Si eres usuario de Magisk, usa KsuWebUI de KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Ajustes en la configuración
`COPG-VD.json` lleva sus ajustes junto al perfil, de modo que tus elecciones viajan con un backup y se pueden editar a mano: `scope_mode`, los interruptores de los engines, los grupos de resetprop, `global_fields`, y un objeto `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). La WebUI escribe tanto la configuración como los archivos de flag que leen los scripts de arranque. `"spoof_version": "force"` se rechaza desde el archivo y se degrada: restaurar un backup antiguo no debe volver a armarlo a tus espaldas.  

## Contactos

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
