> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · Türkçe · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Kullanıcı Kılavuzu

COPG-VD, seçtiğiniz uygulamaların gerçek cihazınız yerine bir Pixel görmesi için cihaz
parmak izini (fingerprint) ve build bilgilerini yeniden yazar. Bu kılavuz sizi kurulumdan
çalışan bir yapılandırmaya ve yol boyunca karşılaşacağınız seçimlere götürür. Her alan ve
değer için [CONFIGURATION.md](CONFIGURATION.md) bölümüne, iç işleyişi için ise
[ARCHITECTURE.md](ARCHITECTURE.md) bölümüne bakın.

## Kurulum

1. zip dosyasını KernelSU, APatch veya Magisk ile flash edin ve yeniden başlatın.
2. Zygisk etkin olmalıdır (yerleşik olarak ya da ReZygisk / Zygisk Next). Magisk
   kullanıcıları: Zygisk'i etkinleştirin.
3. Modül bir Pixel profiliyle gelir, bu yüzden yeniden başlatmanın hemen ardından Google
   Play yığını o Pixel'i zaten görür. Çalışan bir parmak izi varken PlayIntegrityFix veya
   GooglePhotosUnlimited'e ihtiyacınız yoktur.

Modülü yönetmek için root yöneticinizden WebUI'yi açın. Magisk kullanıcıları onu
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases) ile açar. Her
şey ayrıca doğrudan `/data/adb/COPG-VD/COPG-VD.json` içinde de düzenlenebilir.

## Sahteleme kimi etkiler (kapsam)

`scope_mode`, hangi süreçlerin sahte kimliği alacağına karar verir. Kapsamlı bir modda
kimlik, Zygisk tarafından her sürece ayrı ayrı iletilir ve genel özellikler aracılığıyla
sistemin geri kalanına **sızdırılmaz**.

| Mod | Sahtelemeyi kim alır |
|---|---|
| `playstore` (varsayılan) | Yalnızca Play yığını: Google Play services, onun kararsız süreci ve Play Store. |
| `global` | Tüm cihaz: her süreç. |
| `whitelist` | Yalnızca `scope_whitelist` içinde listelenen uygulamalar. |
| `blacklist` | `scope_blacklist` içindekiler hariç her uygulama. |

`playstore` ile başlayın. En hafif seçenektir ve sahtelemeyi alakasız uygulamalara
açmadan Play Integrity'yi geçen seçenektir.

## Motorlar

Her motor bağımsızdır ve kapatılabilir. DRM hariç hepsi varsayılan olarak açıktır.

- **Build alanları (`motor_jni`)** - hedeflenen süreçlerde `android.os.Build.*` değerlerini
  yeniden yazar. Çoğu uygulamanın okuduğu budur.
- **Property hook (`motor_prop_hook`)** - sahte sistem özelliklerini hedeflenen süreçlere,
  özellik alanının süreç başına temiz-oda (clean-room) yeniden eşlemesi yoluyla sunar
  (fonksiyon hook'u yok).
- **resetprop** - sistem özelliklerini cihaz genelinde, gruplar halinde yeniden yazar
  (identity, version, boot state, SELinux, adb/usb, anti-emulator ve bir temizleme geçişi).
  Kapsamlı bir modda identity ve version grupları cihaz geneli geçişin dışında kalır
  (Zygisk bunları süreç başına iletir); boot, lock ve SELinux grupları genel kalır. Bunu
  `COPG-VD-Settings.resetprop` içinde açıp kapatın.
- **DRM / Widevine (`motor_drm`, varsayılan olarak kapalı)** - okuyan uygulamalara seçilen
  bir Widevine güvenlik seviyesi (L1 veya L3) bildirir. Aşağıdaki DRM bölümüne bakın.

## Parmak izini güncel tutmak

Bir parmak izi eskir: Google fabrika imajlarını döndürür ve eski bir imaj yavaşça değerini
kaybeder. `fingerprint-update.sh` sizinkini en yeni Google fabrika imajından güncel tutar.

- WebUI'den (Tools sekmesi): **Check Update** ve **Update Now**.
- Kendi başına, **önyükleme başına bir kez**: **Auto-update JSON on boot** (varsayılan
  olarak açık). Arka planda çalışır, önyüklemede wifi genellikle henüz açık olmadığından
  yaklaşık on dakika boyunca yeniden denemeye devam eder ve önyüklemeyi asla geciktirmez.
- Yalnızca build alanlarını yeniden yazar (fingerprint, ID, incremental, timestamp,
  security patch, SDK, UUID, host, user). Özelleştirdiğiniz her şey korunur ve önceki
  içerik `.bak` olarak kaydedilir.
- Asla geriye gitmez (daha eski bir yukarı akış build'i reddedilir) ve profiliniz farklı
  bir cihazı sahteliyorsa hiçbir şey uygulamaz - başka bir profildeki bir Pixel parmak izi
  eski bir parmak izinden daha kötüdür.
- Güncellemeden hemen sonra `resetprop` yeniden uygulanır, ancak `android.os.Build` zygote
  başladığında yazılır, bu yüzden yeni değerlerin uygulamalara ulaşması için **yeniden
  başlatın**. Günlük: `/data/adb/COPG-VD/update.log`.

## Android sürümü tuzağı

Doğru yapılması en zor şey. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` ve `CODENAME`
**ROM'unuzu** tanımlar, sahtelediğiniz cihazı değil. Uygulamalara SDK'nın framework'ün
gerçekte olduğundan daha yeni olduğunu söylemek, var olmayan API'leri çağırmalarına neden
olur: Google'ın uygulamaları çöker, telefon yeniden başlar ve baştan başlar. Önyüklemenin
kendisi tamamlanır, bu yüzden bu, önyükleme günlüklerinde hiçbir şey bırakmayan bir
**softloop**'tur.

Bu alanlar gelen yapılandırmada yoktur ve güncelleyici onları asla yazmaz. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) bunların hiç uygulanıp
uygulanmayacağına karar verir:

- `never` (varsayılan) - ROM'un kendi sürümü kullanılır.
- `rom` - yalnızca ROM'u aşmayanı uygula; bu pratikte SDK'yı düşürmek anlamına gelir.
- `force` - yapılandırmanın söylediğini tam olarak uygula. Softloop'a neden olan budur;
  yalnızca hedef framework'ün bunu desteklediğini biliyorsanız kullanın.

Gerçek sürüm `/system/build.prop` dosyasından okunur, asla `getprop` üzerinden değil (ki
bu modülün sahtelediği şeyin ta kendisidir). `force` ayrıca bir yedek geri yüklenirken de
reddedilir, böylece eski bir yedek onu sizin arkanızdan yeniden silahlandıramaz.

## DRM / Widevine

Varsayılan olarak kapalı (`motor_drm`). Açıkken, okuyan uygulamalara seçilen bir Widevine
seviyesini, `DRM_SECURITY_LEVEL` (`L1` veya `L3`), bildirir.

Varsayılan olarak DRM sahtelemesi `scope_mode`'u takip eder. Bunun yerine belirli bir
uygulama kümesine - ana kapsamdan bağımsız olarak - uygulamak için bunları `drm_targets`
içinde listeleyin. Modül o zaman, o uygulama ana kapsamın dışında olsa bile, listelenen
bir uygulamada **yalnızca** DRM hook'u için yüklü kalır; boş veya olmayan bir liste,
kapsamı takip et anlamına gelir. Bu, kapsamlı bir mod gerektirir (`global` değil) ve bir
sonraki **yeniden başlatmada** etkili olur.

## Analyze: yapılandırmanızı kontrol edin

WebUI'deki **Analyze** (veya `fingerprint-update.sh analyze`), yapılandırmayı olduğu
haliyle denetler ve bir uygulama yapmadan önce neyin yanlış olduğunu size söyler:

- sürümü ROM'a karşı (softloop yapar mı?),
- dosyanın hâlâ ayrıştırılıp ayrıştırılmadığı (bozuk olan modülün **hiçbir şey**
  sahtelememesine neden olur ve bunu yalnızca logcat söyler),
- parmak izinin etrafındaki alanlarla uyuşup uyuşmadığı,
- modülün okumadığı anahtarlar, şüpheli tarihler ve canlı özelliklerin yapılandırmanın
  istediğini zaten taşıyıp taşımadığı.

Yapılandırmayı elle her düzenlediğinizde çalıştırın.

## WebUI

İsteğe bağlı, ancak her şeyi yönetmenin kolay yolu. Beş sekme:

- **About** - modül ve sürüm bilgisi.
- **Device** - her build alanı, durum başına ayarlanmış ve kategoriye göre gruplanmış.
- **Spoofing** - kapsam modu ve motor anahtarları.
- **System** - resetprop grupları.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, önyükleme otomatik
  güncellemesi ve Diagnostics raporu (bir hata raporu için yararlı olan her şeyi okumak ve
  dışa aktarmak için tek bir düğme).

Hiçbir ağ isteği yapmaz; ihtiyacı olan her şey modülün içinde gelir.

## Sorun giderme

- **Bir uygulama hâlâ gerçek cihazı görüyor.** Kapsamı kontrol edin: `playstore` içinde
  yalnızca Play yığını kapsanır. Yapılandırmanın ayrıştırıldığını doğrulayın (Analyze
  çalıştırın). Motorları, `drm_targets`'ı veya profili değiştirdikten sonra **yeniden
  başlatın** - Zygisk, kapsamı zygote başladığında okur.
- **Play Integrity hâlâ başarısız oluyor.** Parmak izinin güncel olduğundan (Check Update)
  ve `SECURITY_PATCH`'in cihaz genelinde tutarlı kalması için `global_fields` içinde
  olduğundan emin olun. Yeniden doğrulama yapması için Google Play services'i sonlandırın.
- **Sürüm sahtelemesini etkinleştirdikten sonra telefon softloop yapıyor.** Bu, yukarıdaki
  Android sürümü tuzağıdır - `spoof_version`'ı tekrar `never` yapın.
- **WebUI Magisk'te açılmıyor.** [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases)'u kullanın.

*Bu belge Claude (Anthropic) ile oluşturulmuş ve VD171 tarafından sürdürülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır; bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._
