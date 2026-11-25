> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · Türkçe · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI ajanları: denetim yüzeyi

COPG-VD, AI ve ajan katkıda bulunanları memnuniyetle karşılar ve tüm modül, WebUI'yi kazımadan başsız
olarak yönetilecek şekilde oluşturulmuştur. İki yüzey vardır ve root olarak çalışan bir ajan (WebUI'nin
yaptığı gibi) her ikisini de kullanır:

1. **Yapılandırma dosyası** `/data/adb/COPG-VD/COPG-VD.json` - tek doğruluk kaynağı. Her profil alanı ve
   her ayar burada bulunur; bu dosyayı okumak ve yazmak, modülün neyi sahtelediğini değiştirme
   biçiminizdir.
2. **Kabuk giriş noktası** `fingerprint-update.sh` - profilleri kontrol etmek, uygulamak ve getirmek
   için kararlı fiillere sahip tek bir betik.

## Yapılandırma dosyası

`/data/adb/COPG-VD/COPG-VD.json` düz bir JSON nesnesidir. Modül, onu enjekte edilen işlemlerden, kendi
sağladığı özel bir SELinux kuralı aracılığıyla okur; hiçbir kimlik bilgisi tutmaz. Birlikte gelen bir
örnek `module/COPG-VD.json.example` konumunda bulunur ve en yeni Google fabrika imajından her gün
yenilenir.

Bir ajanın uyması gereken kurallar:

- **Dizeler yalnızca çift tırnak kullanır**, JSON'daki gibi.
- **Her alan isteğe bağlıdır.** Sağlanmayan bir alan atlanır ve ROM'un kendi değeri korunur.
- Modülü yönlendiren üst düzey anahtarlar şunlardır: `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, `COPG-VD` nesnesi (Build alanları),
  bir `COPG-VD-Delete` listesi ve bir `COPG-VD-Settings` nesnesi (`resetprop`, `autoupdate`,
  `spoof_version`). [Yapılandırma referansı](CONFIGURATION.md) her birini belgeler.
- `"spoof_version": "force"`, diskteki dosyadan geldiğinde reddedilir ve okunduğunda düşürülür, böylece
  eski bir yedeği geri yüklemek onu sessizce yeniden etkinleştiremez. Sürüm politikasını `force`
  değerini elle yazarak değil, ayarlar aracılığıyla belirleyin.
- Dosyayı düzenledikten sonra **`analyze`** çalıştırın (aşağıda): ayrıştırılamayan bir dosya, modülün
  **hiçbir şeyi** sahtelememesine neden olur ve bunu yalnızca logcat söyler.

Değiştirilen bir yapılandırma, bir sonraki işlem başlangıcında uygulamalara ulaşır. `resetprop` ile
iletilen özellikler yeniden başlatma olmadan yeniden uygulanabilir (`service.sh --props-only`), ancak
`android.os.Build.*` alanları zygote başladığında Zygisk kütüphanesi tarafından yazılır, bu nedenle
bunların uygulamalara ulaşması için **yeniden başlatma gereklidir**.

## Kabuk sözleşmesi

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Betik, insan tarafından okunabilir satırlar yazdırır; makine tarafından okunabilir olanlar `status:` ile
başlar. Çıkış kodu başarıda `0` ve başarısızlıkta sıfırdan farklıdır.

| Fiil | Ne yapar | Tipik çıktı |
|---|---|---|
| `check` | Yüklü profili en yeni upstream build ile karşılaştırır, hiçbir şey yazmaz. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | En yeni profili getirir ve yapılandırmaya birleştirir (yalnızca build alanları; diğer anahtarlarınız korunur). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Yapılandırmayı olduğu haliyle denetler (ayrıştırma, sürüm ve ROM karşılaştırması, fingerprint tutarlılığı, bilinmeyen anahtarlar, tarihler, props). Bir rapor yazdırır; çıkış kodu red/warn bulgularını yansıtır. | bir metin raporu |
| `fetch-index` | İmzalı cihaz dizinini indirir ve doğrular, ardından yazdırır (`index.json`). | dizin JSON'u \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Bir cihazın `build.prop` dosyasını indirir (dizinden gelen yol, örn. `pixel-9a/latest.prop`) ve build alanlarını yapılandırmaya yazar. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Durumu/yapılandırmayı eski düz yerleşimden `/data/adb/COPG-VD/` konumuna taşır. | - |
| `migrate` | Modül sürümleri arasında tek seferlik yapılandırma taşıma. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Önyükleme başına bir kez otomatik güncelleme; `service.sh` için tasarlanmıştır, etkileşimli kullanım için değil. | `update.status` yazar |

Her indirme, kullanılmadan önce doğrulanır (cihazdaki tek indirici, TLS'yi doğrulayamayan busybox
`wget`'tir) ve profil güncelleyicisi asla geriye gitmez: yüklü olandan daha eski bir upstream build
reddedilir. Besleme dizini ve her `.prop`, içerik okunmadan önce doğrulanan ayrı bir ed25519 imzası
taşır.

## Tipik ajan akışları

- **Profili taze tutun:** `check`; `status: update-available` ise `apply`; ardından yeni `Build.*`
  değerlerinin uygulamalara ulaşması için yeniden başlatın.
- **Başka bir Pixel profiline geçin:** `fetch-index`, dizinden bir cihaz yolu seçin, `fetch <path>`,
  yapılandırmanın tutarlı olduğunu doğrulamak için `analyze` çalıştırın, ardından yeniden başlatın.
- **Kapsamı veya bir motoru değiştirin:** yapılandırma dosyasında `scope_mode` (veya bir motor anahtarı)
  düzenleyin, `analyze` çalıştırın, ardından özellik ile iletilen değişiklikler için `service.sh
  --props-only` çalıştırın veya Build alanları için yeniden başlatın.

## Güvenlik bariyerleri

- Yapılandırmayı değiştirmek veya bir profil uygulamak, hedeflenen her uygulamanın gördüğünü değiştirir;
  yazmadan önce, WebUI'nin yaptığı gibi niyeti doğrulayın.
- Gerçek bir tutarlılık korumasını asla gevşetmeyin: SDK her politika altında gerçek framework ile
  sınırlandırılır, üretici profilin geri kalanıyla uyumlu kalır ve farklı bir cihaza ait profil
  reddedilir. Bunlar bilinçlidir ve atlanmamalıdır.
- Yapılandırma, desteklenen yüzeydir. WebUI'nin kendisini kazımayın veya otomatikleştirmeyin.

<!-- doc-footer -->

---

> _Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır; bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._
