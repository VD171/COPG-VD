## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD bir cihaz sahteleyicidir: cihazın fingerprint ve build bilgisini yeniden yazar, böylece uygulamalar gerçek cihaz yerine sizin seçtiğiniz cihazı görür.  
Zygisk (KernelSU, APatch veya Magisk) üzerinde çalışır ve varsayılan olarak sahteciliğin kapsamını Google Play yığınına daraltır - bu yüzden PlayIntegrityFix'e göre daha hafif ve daha sağlam bir alternatiftir.  

## Ekran görüntüleri

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Nasıl kullanılır?
Modülü kurun, yeniden başlatın; böylece birlikte gelen profil (bir Pixel) hedeflenen uygulamalara sahtelenir. Çalışan bir fingerprint ile PlayIntegrityFix veya GooglePhotosUnlimited'e ihtiyacınız olmaz.  
Her şey `/data/adb/COPG-VD.json` içinde ya da WebUI'den yapılandırılır. Tüm alanlar İSTEĞE BAĞLIDIR - sağlanmayan bir alan atlanır.  

### Scope - sahteciliği kim görür
`scope_mode`, sahtelenen kimliği hangi süreçlerin alacağına karar verir. Kapsamı daraltılmış bir modda kimlik, Zygisk tarafından süreç başına teslim edilir ve global özellikler aracılığıyla sistemin geri kalanına sızmaz.  
* **Google Play** (`playstore`, varsayılan) - yalnızca Play yığını (Google Play services, onun kararsız (unstable) süreci ve Play Store).  
* **Global** - tüm cihaz; her süreç onu görür.  
* **Whitelist** - yalnızca `scope_whitelist` içindeki uygulamalar.  
* **Blacklist** - `scope_blacklist` içindekiler dışındaki her uygulama.  

### Engines - sahtecilik nasıl teslim edilir
Her biri bağımsızdır ve kapatılabilir:  
* **Build fields (JNI)** - hedeflenen süreçlerde `android.os.Build.*` ögesini yeniden yazar.  
* **Property hook** - sahtelenen sistem özelliklerini hedeflenen süreçlere sunar (özellik alanının süreç başına clean-room yeniden eşlemesi, işlev hook'u yok).  
* **resetprop** - sistem özelliklerini yeniden yazar, grup halinde yönetilir: identity, version, boot state, SELinux, adb/usb, anti-emulator ve bir temizlik geçişi. Kapsamı daraltılmış bir modda identity ve version grupları cihaz genelindeki resetprop'un dışında kalır (Zygisk bunları süreç başına teslim eder); boot/lock/SELinux grupları global kalır.  
* **DRM / Widevine** (varsayılan olarak kapalı) - seçilen bir Widevine güvenlik seviyesini, L1 veya L3, onu okuyan uygulamalara bildirir. Varsayılan olarak yukarıdaki kapsamı izler; DRM spoof'unu yalnızca belirli uygulamalara uygulamak için `drm_targets` (bir uygulama listesi) ayarlayın, `scope_mode`'dan bağımsız olarak - modül, listelenen bir uygulamada yalnızca DRM hook için yüklü kalır, o uygulama ana kapsamın dışında olsa bile. Boş veya yok, kapsamı izlemek anlamına gelir. (Kapsamlı bir mod gerektirir, Global değil.)  

### Fields - set, empty, delete veya skip
`COPG-VD` nesnesinin içinde her Build alanının dört durumu vardır:  
* **Set** - `"KEY": "value"` değeri yazar.  
* **Empty** - `"KEY": ""` boş bir değer yazar.  
* **Delete** - kaldırmak için anahtarı üst seviyedeki `"COPG-VD-Delete": [ ... ]` içinde listeleyin (bir Build alanı null olur, bir özellik `resetprop --delete` ile kaldırılır).  
* **Skip** - anahtarı tamamen dışarıda bırakın; ROM'un kendi değeri korunur.  

Bir `"global_fields": [ ... ]` listesi, bir değeri her yerde tutarlı tutmak için, kapsamı daraltılmış bir modda bile adı verilen Build alanlarını cihaz genelinde uygular - yalnızca tutarlılık açısından güvenli alanlar için (örneğin güvenlik yaması), asla identity için ve asla Android sürüm grubu için değil.  

### Example JSON config file
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.261016.008-factory-28d56d15.zip",
  "scope_mode": "playstore",
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": [],
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.261016.008",
    "ID": "ZP11.261016.008",
    "HOST": "e4df75f83a59",
    "INCREMENTAL": "16754936",
    "TIMESTAMP": "1793211232",
    "PREVIEW_SDK": "20261104",
    "USER": "android-build",
    "SDK_FINGERPRINT": "ee82a872870173d77e68050e21a2bcbf",
    "UUID": "FjWvtSORkI0sEwekaPz2s30gqV5vWP_EZHFtBiXzboc",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  }
}
```
Dizeleri yalnızca çift tırnak içinde kullandığınızdan emin olun.  
Yukarıdaki blok ve `module/COPG-VD.json.example`, en yeni Google fabrika imajından doğrudan alınarak [Update COPG-VD.json](.github/workflows/update-json.yml) iş akışı tarafından her gün yenilenir.  

### Fingerprint'i güncel tutmak
`fingerprint-update.sh` o dosyayı çeker ve yapılandırmanızı günceller; bunu ya WebUI'den (**Check Update** / **Update Now**) ya da kendi kendine **her açılışta bir kez** (**Auto-update JSON on boot**, varsayılan olarak açık) yapar.  
* Her ikisi de mevcut olduğunda hem `/data/adb/COPG-VD.json` hem de `/data/adb/modules/COPG-VD/COPG-VD.json` güncellenir ve önceki içerik `.bak` olarak saklanır.  
* Yalnızca build alanları yeniden yazılır (fingerprint, ID, incremental, timestamp, güvenlik yaması, SDK, UUID, host, user). Özelleştirdiğiniz diğer her şey korunur: ek anahtarlar, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, diğer nesneler, anahtar sırası ve biçimlendirme.  
* Asla geriye gitmez: yüklü olandan daha eski bir üst kaynak (upstream) build reddedilir. Bu olağandır (repo, elle güncellediğiniz bir yapılandırmanın gerisinde kalabilir) ve ayrıca Android'de en çok önem taşıyan korumadır; çünkü Android'de mevcut tek indirici busybox `wget`'tir ve bu da TLS sertifikalarını doğrulayamaz - aynı nedenle her değer kullanılmadan önce doğrulanır.  
* Profiliniz **başka bir cihazı** sahteliyorsa (farklı `BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT`), hiçbir şey uygulanmaz - başka bir profildeki bir Pixel fingerprint'i, eski bir fingerprint'ten daha kötüdür.  
* Açılışta arka planda çalışır ve yaklaşık 10 dakika boyunca tekrar denemeyi sürdürür; çünkü açılış tamamlandığında genellikle wifi henüz hazır değildir. Açılışı asla geciktirmez.  
* `resetprop`, bir güncellemeden hemen sonra yeniden uygulanır, ancak `android.os.Build`, zygote başladığında zygisk modülü tarafından yazılır: yeni değerlerin uygulamalara ulaşması için **yeniden başlatın**.  
* Günlük `/data/adb/COPG-VD.update.log` konumundadır.  

### Android sürümü - ve neden sahtelenmiyor
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` ve `CODENAME`, sahtelenen cihazı değil **sizin ROM'unuzu** tanımlar. Uygulamalara SDK'nın framework'ün gerçekte olduğundan daha yeni olduğunu söylemek, onların var olmayan API'leri çağırmasına neden olur: Google'ın uygulamaları çöker, telefon yeniden başlar ve her şey baştan başlar. Açılışın kendisi tamamlandığı için bu bir **softloop**'tur ve açılış günlüklerinde hiçbir şey görünmez.  
* Bunlar paketlenmiş yapılandırmada yer almaz ve güncelleyici bunları asla yazmaz.  
* WebUI'deki **Spoof Android version**, bunların hiç uygulanıp uygulanmayacağına karar verir:  
  * **Never** (varsayılan) - ROM'un kendi sürümü kullanılır.  
  * **Up to this ROM** - yalnızca bunu aşmayan kısım, ki bu pratikte SDK'yı düşürmek demektir.  
  * **Force** - tam olarak yapılandırmanın söylediği şey. Softloop'a yol açan budur.  
* Gerçek sürüm `/system/build.prop`'tan okunur, asla `getprop`'tan değil - çünkü bu modülün sahtelediği şey tam da odur.  

### Analyze
WebUI'deki **Analyze** (veya `fingerprint-update.sh analyze`), yapılandırmayı olduğu haliyle denetler: sürümü ROM'a karşı, dosyanın hâlâ ayrıştırılabilir olup olmadığını (bozuk bir dosya modülün **hiçbir şeyi** sahtelememesine yol açar ve bunu yalnızca logcat söyler), fingerprint'in çevresindeki alanlarla uyuşup uyuşmadığını, modülün okumadığı anahtarları, tarihleri ve propların yapılandırmanın istediği değerleri zaten taşıyıp taşımadığını kontrol eder.  

### WebUI
WebUI isteğe bağlıdır - her şey doğrudan JSON yapılandırmasında düzenlenebilir - ancak modülü sürmenin kolay yolu odur. Beş sekmesi vardır: **About**, **Device** (her alan, duruma göre ayarlanır, kategoriye göre gruplanır), **Spoofing** (scope ve engines), **System** (resetprop grupları) ve **Tools** (Analyze, Check Update, Update Now, Backup/Restore ve açılışta otomatik güncelleme). Hiçbir ağ isteği yapmaz; ihtiyaç duyduğu her şey modülün içinde gelir.  
Magisk kullanıcısıysanız, KOW tarafından geliştirilen KsuWebUI'yi kullanın (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Yapılandırmadaki ayarlar
`COPG-VD.json` ayarlarını profilin yanında taşır, böylece seçimleriniz bir yedekle birlikte taşınır ve elle düzenlenebilir: `scope_mode`, engine anahtarları, resetprop grupları, `global_fields` ve bir `COPG-VD-Settings` nesnesi (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). WebUI hem yapılandırmayı hem de açılış betiklerinin okuduğu bayrak dosyalarını yazar. `"spoof_version": "force"` dosyadan reddedilir ve düşürülür: eski bir yedeği geri yüklemek, onu arkanızdan yeniden etkinleştirmemelidir.  

## İletişim

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
* **GitHub:** @VD171 https://github.com/VD171

<!-- vd-docs -->
## Belgeler

[Kullanıcı Kılavuzu](docs/tr/USER-GUIDE.md) · [Yapılandırma referansı](docs/tr/CONFIGURATION.md) · [Mimari](docs/tr/ARCHITECTURE.md) · [Dosya yapısı](docs/tr/FILE-STRUCTURE.md) · [Wiki](https://github.com/VD171/COPG-VD/wiki/tr-Home)

<!-- vd-see-also -->

## Ayrıca bakınız

- **[VD Infos](https://github.com/VD171/VD-Infos)** - Yöntem hata ayıklayıcı
- **[VD Google](https://github.com/VD171/VD-Google)** - Google hizmetleriniz, cihazınızda okunur
- **[VD Backup](https://github.com/VD171/VD-Backup)** - Uygulamalarınızı ve verilerinizi yedekleyin ve geri yükleyin

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork of @T3SL4).

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
