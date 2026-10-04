## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD es un modulo disenado para el spoofing global del dispositivo.  
Esto significa que incluso las apps del sistema y el dispositivo completo seran hookeados.  
  
## Como se usa?
Si usas este modulo y spoofeas un FingerPrint que funcione, no es necesario usar PlayIntegrityFix ni GooglePhotosUnlimited.  
### Ejemplo de archivo de configuracion JSON  
`/data/adb/COPG-VD.json`
* Todos los campos son OPCIONALES. Si no se proporciona algun campo, se omitira.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
Asegurate de usar strings solo entre comillas dobles.  
El bloque de arriba y `module/COPG-VD.json.example` se actualizan a diario mediante el workflow [Update COPG-VD.json](.github/workflows/update-json.yml), directamente desde la imagen de fabrica mas reciente de Google.  
### Mantener el fingerprint actualizado  
`fingerprint-update.sh` descarga ese archivo y actualiza tu configuracion, desde la WebUI (**Check Update** / **Update Now**) o por si mismo **una vez por arranque** (**Auto-update JSON on boot**, activado por defecto).  
* Tanto `/data/adb/COPG-VD.json` como `/data/adb/modules/COPG-VD/COPG-VD.json` se actualizan cuando ambos existen, y el contenido anterior se conserva como `.bak`.  
* Solo se reescriben los campos de build (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Todo lo demas que personalizaste se conserva: claves adicionales, `BOOTLOADER`/`BOARD`/`HARDWARE`, otros objetos, el orden de las claves y el formato.  
* Nunca retrocede: un build upstream mas antiguo que el instalado es rechazado. Esto es
  rutinario (el repo puede quedar por detras de una configuracion que actualizaste a mano) y es tambien la proteccion que
  mas importa en Android, donde el unico descargador disponible es busybox `wget`, que no puede
  validar certificados TLS - por esa misma razon cada valor se valida antes de usarse.  
* Si tu perfil spoofea **otro dispositivo** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` distintos), no se aplica nada - un fingerprint de Pixel en otro perfil es peor que un fingerprint antiguo.  
* En el arranque se ejecuta en segundo plano y sigue reintentando durante ~10 minutos, porque el wifi normalmente aun no esta levantado cuando termina el arranque. Nunca retrasa el arranque.  
* `resetprop` se vuelve a aplicar justo despues de una actualizacion, pero `android.os.Build` lo escribe el modulo zygisk cuando zygote arranca: **reinicia** para que los nuevos valores lleguen a las apps.  
* Log en `/data/adb/COPG-VD.update.log`.  
### Version de Android - y por que no se spoofea  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` y `CODENAME` describen **tu ROM**, no el dispositivo que se spoofea. Decirles a las apps que el SDK es mas nuevo de lo que realmente es el framework hace que llamen a APIs que no existen: las apps de Google se bloquean, el telefono se reinicia y vuelve a empezar. El arranque en si se completa, asi que es un **softloop** y no aparece nada en los logs de arranque.  
* No estan en la configuracion que se entrega y el actualizador nunca los escribe.  
* **Spoof Android version** en la WebUI decide si se aplican siquiera:  
  * **Never** (por defecto) - se usa la propia version de la ROM.  
  * **Up to this ROM** - solo lo que no la excede, lo que en la practica significa rebajar el SDK.  
  * **Force** - exactamente lo que dice la configuracion. Esto es lo que causa el softloop.  
* La version real se lee de `/system/build.prop`, nunca de `getprop` - que es justo lo que este modulo falsifica.  
### Analyze  
**Analyze** en la WebUI (o `fingerprint-update.sh analyze`) audita la configuracion tal como esta: la version frente a la ROM, si el archivo todavia se puede parsear (uno roto hace que el modulo no spoofee **nada**, y solo logcat lo dice), si el fingerprint concuerda con los campos que lo rodean, claves que el modulo no lee, fechas, y si las props ya contienen lo que la configuracion pide.  
### Ajustes en la configuracion  
`COPG-VD.json` puede llevar un objeto `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - para que tus elecciones viajen con un backup y se puedan editar a mano. La WebUI escribe tanto eso como los archivos de flag que leen los scripts de arranque. `"spoof_version": "force"` se rechaza desde el archivo y se degrada: restaurar un backup antiguo no debe volver a armarlo a tus espaldas.  
### WebUI  
Usar la WebUI no es necesario si editas el archivo de configuracion JSON directamente.  
Si eres usuario de Magisk, usa KsuWebUI de KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Desactiva el uso de resetprop y activa solo el spoofing de la info de Build.  
#### Use ro.product.manufacturer:  
Desactivalo si te importa la deteccion "Found device spoofing" en la app detectora de root Disclosure.  

## Contactos

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
