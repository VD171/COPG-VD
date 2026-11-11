> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · Türkçe · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Mimari

COPG-VD bir Zygisk modülüdür: Zygisk yükleyicisinin zygote'a ve oradan uygulama
süreçlerine enjekte ettiği küçük bir native kütüphane (`libspoof.so`). Yaptığı tek şey,
hedeflediğiniz süreçlere seçilen bir cihaz kimliğini sunmaktır. Bir uygulama yoktur ve
isteğe bağlı profil getirme dışında ağ yoktur.

## Yaşam döngüsü

1. **Zygote başlangıcı.** Zygote önyüklendiğinde, yükleyici modülün `onLoad`'ını çağırır.
   `/data/adb/COPG-VD/COPG-VD.json` dosyasını bir kez okur: kapsam yapılandırmasını ve profili.
2. **App fork.** Zygote'un fork ettiği her uygulama için, modül `preAppSpecialize` içinde
   bu sürecin kapsamda olup olmadığına karar verir:
   - **ana kapsamda** (`playstore` / `global` / `whitelist` / `blacklist`) veya
   - **DRM kapsamında** (`drm_targets` içinde listelenmiş).
   İkisi de değilse, modül o süreçten **ayrılır** (`dlclose`) ve içinde hiçbir iz
   bırakmaz.
3. **Specialize.** Kalan bir süreç için, süreç hâlâ ayrıcalıklıyken motorlar
   `postAppSpecialize` içinde uygulanır.

Fork'lar zygote'un copy-on-write bellek kopyasını miras aldığından, her uygulama
önyüklemede okunan yapılandırmadan başlar. Modül, dosyayı yalnızca gerçekten değiştiğinde
hedeflenen süreç başına yeniden okur, böylece yeni başlatılan veya yeniden açılan bir
uygulama düzenlenmiş bir profili alır - ancak kapsam kararının kendisi zygote başlangıcında
verilir, bu yüzden **kapsamı, motorları veya `drm_targets`'ı değiştirmek yeniden başlatma
gerektirir**.

## Motorlar

Her biri bağımsız ve değiştirilebilir.

- **Build alanları (`motor_jni`).** Hedeflenen süreçte `android.os.Build.*` (ve
  `Build.VERSION.*`) değerlerini JNI aracılığıyla yeniden yazar, böylece Java kodu sahte
  değerleri okur.
- **Property hook (`motor_prop_hook`).** Sahte sistem özelliklerini sürece, özellik
  alanının temiz-oda, süreç başına yeniden eşlemesi (`prop_virtualizer`) aracılığıyla
  sunar. Bu bir bellek yeniden eşlemesidir, fonksiyon hook'u değil, bu yüzden hook'lanmış
  fonksiyon izi yoktur.
- **resetprop (cihaz geneli).** Sistem özelliklerini gruplar halinde yazar - identity,
  version, boot state, SELinux, adb/usb, anti-emulator, artı bir temizleme geçişi.
  Önyükleme betikleri onu çalıştırır. Kapsamlı bir modda identity ve version grupları
  dışarıda bırakılır (Zygisk bunları süreç başına iletir); boot, lock ve SELinux grupları
  cihazın tutarlı olması için genel kalır.
- **DRM / Widevine (`motor_drm`).** Widevine güvenlik seviyesini bildiren `MediaDrm`
  metotlarını (`getSecurityLevel`, `getPropertyString`) hook'lar ve yapılandırılan
  seviyeyi döndürür. Hook'lar null kontrolünden geçer, bu yüzden bozuk bir profil
  uygulamayı çökertmek yerine zarifçe bozulur. `drm_targets`, bu motorun ana kapsamdan
  ayrışmış, kendi uygulama listesinde çalışmasını sağlar.

## Yapılandırmayı okuma

Enjekte edilen süreç, varsayılan olarak `/data/adb`'ye erişemeyen zygote SELinux alanında
çalışır. Modül buna izin vermek için kendi `sepolicy.rule`'unu getirir ve bir yedek
olarak, yapılandırmayı açık modül dizini (`getModuleDir`) aracılığıyla okuyabilir, böylece
bir Zygisk build'i yolu vermeyi durdursa bile çalışmaya devam eder. Dosya, küçük gömülü bir
JSON ayrıştırıcıyla (`jsmn`) ayrıştırılır; ayrıştırılamayan bir dosya, modülün hiçbir şey
sahtelememesi anlamına gelir.

## Profili güncel tutmak

`fingerprint-update.sh`, build alanlarını en yeni Google fabrika imajından, WebUI'den veya
önyükleme başına bir kez yeniler. Modülün kendi birlikte gelen indiricisini kullanır
(`PATH`'ten bir `curl`/`wget` değil), kullanmadan önce her değeri doğrular, asla geriye
gitmez ve farklı bir cihazı sahteleyen bir profili reddeder. `android.os.Build` zygote
başlangıcında yazılır, bu yüzden yeni değerler bir sonraki yeniden başlatmada uygulamalara
ulaşır. Kullanıcı tarafı için [USER-GUIDE.md](USER-GUIDE.md) bölümüne ve alanlar için
[CONFIGURATION.md](CONFIGURATION.md) bölümüne bakın.

## Android sürümü neden varsayılan olarak sahtelenmez

`SDK_INT` / `ANDROID_VERSION` değerini ROM'un framework'ünün gerçekte olduğundan daha
yükseğe çıkarmak, uygulamaların var olmayan API'leri çağırmasına neden olur; bu da
Google'ın uygulamalarını çökertir ve telefonu bir softloop'a sokar. Bu nedenle sürüm grubu
varsayılan olarak kapalıdır ve `spoof_version`'ın arkasında kapılıdır. Modül gerçek sürümü
`/system/build.prop` dosyasından okur, asla `getprop` üzerinden değil, çünkü `getprop` tam
olarak sahtelediği şeydir. Tuzak için [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap)
bölümüne bakın.

*Bu belge Claude (Anthropic) ile oluşturulmuş ve VD171 tarafından sürdürülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [../CONTRIBUTING.md](CONTRIBUTING.md).*
