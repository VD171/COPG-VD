> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · Türkçe · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# COPG-VD'ye katkıda bulunma

Yardım ettiğiniz için teşekkürler! COPG-VD'nin katkıda bulunması kolay olacak şekilde
tasarlandı. Bu kılavuz size şeylerin nerede olduğunu ve izlediğimiz birkaç kuralı anlatır.

## Projeye bir bakış

COPG-VD bir **Zygisk cihaz sahteleyicisidir (Zygisk device spoofer)**: cihaz parmak izini
ve build bilgisini yeniden yazmak için uygulama süreçlerine enjekte edilen küçük bir native
kütüphane, artı onu yönetmek için saf-JS (vanilla-JS) bir WebUI. COPG'nin (AlirezaParsi
tarafından) bir fork'udur, Apache-2.0 lisansı altında VD171 tarafından sürdürülür. Bkz.
[ARCHITECTURE.md](ARCHITECTURE.md) ve [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Varsayılan olarak sahtelemeyi Zygisk aracılığıyla Google Play yığınına kapsar, bu yüzden
PlayIntegrityFix'e göre daha hafif, daha sağlam bir alternatiftir.

## AI katkıda bulunanlar hoş karşılanır

AI asistanları ve ajanları burada birinci sınıf katkıda bulunanlardır, sonradan akla gelen
bir şey değil.

- Proje okunabilir olacak şekilde inşa edilmiştir: yapılandırma tek bir JSON dosyasıdır
  (`/data/adb/COPG-VD/COPG-VD.json`, [CONFIGURATION.md](CONFIGURATION.md) içinde belgelenmiş),
  motorlar küçük ve kendi kendine yeterlidir ve düzen [FILE-STRUCTURE.md](FILE-STRUCTURE.md)
  içindedir.
- AI destekli yamalar, herhangi bir diğeriyle aynı koşullarda incelenir ve kabul edilir -
  doğruluk, netlik ve aşağıdaki kurallara göre, kim (ya da ne) yazdığına göre değil.
- Herkes için aynı çıta: gerçek bir özellik asla zayıflatılmaz, sahteleme tutarlı kalır ve
  depoya gizli veya cihaza özgü hiçbir şey girmez (bkz. [.gitignore](../../.gitignore)).

## Geliştirme kurulumu

- Test etmek için Zygisk'li (KernelSU, APatch veya Magisk) root'lanmış bir cihaza veya
  emülatöre ihtiyacınız var.
- Native kütüphaneyi ABI başına NDK (r29) ve CMake ile derleyin - tam komut için
  [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) içindeki `Build zygisk
  libraries` adımına bakın. CI her üç ABI'yi sizin için derler.
- Flash edilebilir bir zip derleyin: derlenen `libspoof.so` dosyasını `module/zygisk/<abi>.so`
  içine kopyalayın, ardından `cd module && zip -r9 ../COPG-VD-dev.zip .` yapın ve flash edin.
- WebUI `module/webroot/` içindedir (root yöneticisinden açın). Sahteleme mantığı
  `zygisk/spoof_module.cpp`'dir; profil getirici `module/fingerprint-update.sh`'dir.

## Kurallar

- **Her modül kaynak dosyası** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) proje başlık afişi
  (banner header) ile başlar (herhangi bir mevcut dosyadan kopyalayın). `.github/`
  altındaki araçlar bunun yerine kısa bir yorum kullanır.
- **Kod ve yorumlar İngilizce.** Yorumları minimumda ve yalnızca gerektiğinde tutun.
- **em-dash veya en-dash yok**; her zaman düz bir tire `-` kullanın.
- WebUI **saf JS**'dir (tek bir `scripts.js`); framework yok.
- Gerçek bir özelliği **asla zayıflatmayın**: sahtelemeyi tutarlı tutun ve hook'ların bağlı
  oldukları bir uygulamayı çökertmesine izin vermeyin (bilerek null kontrolünden geçerler).

## Uluslararasılaştırma (i18n)

- UI dizeleri `module/webroot/lang/` içinde yaşar. İngilizce, kanonik yedektir (`en.js` +
  `en.json`); diğer 20 dil `<code>.json`'dur.
- Bir dize eklemek veya değiştirmek için: `en.js` **ve** `en.json` dosyalarını düzenleyin,
  ardından her `<code>.json` dosyasını güncelleyin. Görünür bir etikete dokunmak, **tüm**
  dil dosyalarını ve **tüm** `README.<code>.md` dosyalarını güncellemek anlamına gelir.
- Çeviriler düz JSON'dur - harika bir ilk katkı.

## Commit'ler ve PR'lar

- PR'ları odaklı tutun. Neyi ve neden yaptığınızı açıklayın.
- Commit'lerinizi onaylayın (DCO): `git commit -s` (`Signed-off-by:` ekler).
- CI yeşil kalmalıdır. İncelemelerde nazik olun - bkz. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## İyi ilk konular (good first issues)

`good first issue` ve `help wanted` etiketlerine bakın. Çeviriler, belgeler ve yeni Pixel
profilleri harika başlangıç noktalarıdır.

*Bu belge Claude (Anthropic) ile oluşturulmuş ve VD171 tarafından sürdürülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [CONTRIBUTING.md](CONTRIBUTING.md).*
