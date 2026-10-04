## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD, genel cihaz sahteciliği (spoofing) için tasarlanmış bir modüldür.  
Bu, sistem uygulamalarının ve tüm cihazın bile hooklanacağı anlamına gelir.  
  
## Nasıl kullanılır?
Bu modülü kullanıyor ve çalışan bir FingerPrint sahteciliği yapıyorsanız, PlayIntegrityFix veya GooglePhotosUnlimited kullanmanıza gerek yoktur.  
### Örnek JSON yapılandırma dosyası  
`/data/adb/COPG-VD.json`
* Tüm alanlar İSTEĞE BAĞLIDIR. Herhangi bir alan sağlanmazsa, atlanır.  
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
Dizeleri yalnızca çift tırnak içinde kullandığınızdan emin olun.  
Yukarıdaki blok ve `module/COPG-VD.json.example`, en yeni Google fabrika imajından doğrudan alınarak [Update COPG-VD.json](.github/workflows/update-json.yml) iş akışı tarafından her gün yenilenir.  
### Fingerprint'i güncel tutmak  
`fingerprint-update.sh` o dosyayı çeker ve yapılandırmanızı günceller; bunu ya WebUI'den (**Check Update** / **Update Now**) ya da kendi kendine **her açılışta bir kez** (**Auto-update JSON on boot**, varsayılan olarak açık) yapar.  
* Her ikisi de mevcut olduğunda hem `/data/adb/COPG-VD.json` hem de `/data/adb/modules/COPG-VD/COPG-VD.json` güncellenir ve önceki içerik `.bak` olarak saklanır.  
* Yalnızca build alanları yeniden yazılır (fingerprint, ID, incremental, timestamp, güvenlik yaması, SDK, UUID, host, user). Özelleştirdiğiniz diğer her şey korunur: ek anahtarlar, `BOOTLOADER`/`BOARD`/`HARDWARE`, diğer nesneler, anahtar sırası ve biçimlendirme.  
* Asla geriye gitmez: yüklü olandan daha eski bir üst kaynak (upstream) build reddedilir. Bu
  olağandır (repo, elle güncellediğiniz bir yapılandırmanın gerisinde kalabilir) ve ayrıca Android'de
  en çok önem taşıyan korumadır; çünkü Android'de mevcut tek indirici busybox `wget`'tir ve bu da TLS
  sertifikalarını doğrulayamaz - aynı nedenle her değer kullanılmadan önce doğrulanır.  
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
### Yapılandırmadaki ayarlar  
`COPG-VD.json` bir `COPG-VD-Settings` nesnesi taşıyabilir - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - böylece seçimleriniz bir yedekle birlikte taşınır ve elle düzenlenebilir. WebUI hem bunu hem de açılış betiklerinin okuduğu bayrak dosyalarını yazar. `"spoof_version": "force"` dosyadan reddedilir ve düşürülür: eski bir yedeği geri yüklemek, onu arkanızdan yeniden etkinleştirmemelidir.  
### WebUI  
JSON yapılandırma dosyasını doğrudan düzenliyorsanız WebUI'yi kullanmanıza gerek yoktur.  
Magisk kullanıcısıysanız, KOW tarafından geliştirilen KsuWebUI'yi kullanın (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### resetprop kullan:  
resetprop kullanımını devre dışı bırakın ve yalnızca Build bilgisi sahteciliğini etkinleştirin.  
#### ro.product.manufacturer kullan:  
Disclosure root algılama uygulamasındaki "Found device spoofing" algılamasını önemsiyorsanız devre dışı bırakın.  

## İletişim

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
