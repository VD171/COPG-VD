## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD là một module được thiết kế để giả mạo thiết bị trên toàn hệ thống.  
Điều này có nghĩa là ngay cả các ứng dụng hệ thống và toàn bộ thiết bị cũng sẽ bị hook.  
  
## Cách sử dụng?
Nếu dùng module này và giả mạo một FingerPrint hoạt động được, thì không cần dùng PlayIntegrityFix hay GooglePhotosUnlimited.  
### Ví dụ tệp cấu hình JSON  
`/data/adb/COPG-VD.json`
* Tất cả các trường đều TÙY CHỌN. Nếu một trường nào đó không được cung cấp, nó sẽ bị bỏ qua.  
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
Hãy chắc chắn chỉ dùng chuỗi trong dấu ngoặc kép.  
Khối ở trên và `module/COPG-VD.json.example` được làm mới hằng ngày bởi quy trình [Update COPG-VD.json](.github/workflows/update-json.yml), lấy trực tiếp từ ảnh factory mới nhất của Google.  
### Giữ cho fingerprint luôn mới  
`fingerprint-update.sh` tải tệp đó về và cập nhật cấu hình của bạn, từ WebUI (**Check Update** / **Update Now**) hoặc tự động **mỗi lần khởi động một lần** (**Auto-update JSON on boot**, bật theo mặc định).  
* Cả `/data/adb/COPG-VD.json` lẫn `/data/adb/modules/COPG-VD/COPG-VD.json` đều được cập nhật khi cả hai cùng tồn tại, và nội dung trước đó được giữ lại dưới dạng `.bak`.  
* Chỉ các trường build được ghi lại (fingerprint, ID, incremental, timestamp, bản vá bảo mật, SDK, UUID, host, user). Mọi thứ khác mà bạn đã tùy chỉnh đều được giữ nguyên: các khóa bổ sung, `BOOTLOADER`/`BOARD`/`HARDWARE`, các đối tượng khác, thứ tự khóa và định dạng.  
* Nó không bao giờ lùi về sau: một bản build thượng nguồn cũ hơn bản đã cài sẽ bị từ chối. Đây là
  chuyện thường tình (repo có thể tụt lại sau một cấu hình bạn đã cập nhật bằng tay) và cũng là lớp bảo vệ
  quan trọng nhất trên Android, nơi trình tải xuống duy nhất có sẵn là busybox `wget`, vốn không thể
  xác thực chứng chỉ TLS - vì cùng lý do đó, mọi giá trị đều được xác thực trước khi sử dụng.  
* Nếu hồ sơ của bạn giả mạo **một thiết bị khác** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` khác), sẽ không có gì được áp dụng - một fingerprint Pixel trên một hồ sơ khác còn tệ hơn một fingerprint cũ.  
* Khi khởi động, nó chạy trong nền và tiếp tục thử lại trong khoảng 10 phút, vì wifi thường chưa hoạt động khi quá trình khởi động hoàn tất. Nó không bao giờ làm chậm quá trình khởi động.  
* `resetprop` được áp dụng lại ngay sau một lần cập nhật, nhưng `android.os.Build` được ghi bởi module zygisk khi zygote khởi động: **khởi động lại** để các giá trị mới đến được với các ứng dụng.  
* Nhật ký tại `/data/adb/COPG-VD.update.log`.  
### Phiên bản Android - và vì sao nó không bị giả mạo  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` và `CODENAME` mô tả **ROM của bạn**, không phải thiết bị đang bị giả mạo. Việc nói với các ứng dụng rằng SDK mới hơn framework thực tế khiến chúng gọi những API không tồn tại: các ứng dụng của Google bị sập, điện thoại khởi động lại, rồi lặp lại từ đầu. Bản thân quá trình khởi động vẫn hoàn tất, nên đây là một **softloop** và không có gì hiện ra trong nhật ký khởi động.  
* Chúng không nằm trong cấu hình đi kèm và trình cập nhật không bao giờ ghi chúng.  
* **Spoof Android version** trong WebUI quyết định liệu chúng có được áp dụng hay không:  
  * **Never** (mặc định) - dùng chính phiên bản của ROM.  
  * **Up to this ROM** - chỉ những gì không vượt quá nó, mà trên thực tế nghĩa là hạ thấp SDK.  
  * **Force** - đúng y như cấu hình quy định. Đây chính là thứ gây ra softloop.  
* Phiên bản thật được đọc từ `/system/build.prop`, không bao giờ từ `getprop` - vì đó chính là thứ mà module này làm giả.  
### Analyze  
**Analyze** trong WebUI (hoặc `fingerprint-update.sh analyze`) kiểm tra cấu hình ở trạng thái hiện tại: phiên bản so với ROM, liệu tệp còn phân tích cú pháp được hay không (một tệp hỏng khiến module giả mạo **không gì cả**, và chỉ logcat mới cho biết điều đó), liệu fingerprint có khớp với các trường xung quanh hay không, các khóa mà module không đọc, các ngày tháng, và liệu các prop đã mang sẵn những gì cấu hình yêu cầu hay chưa.  
### Cài đặt trong cấu hình  
`COPG-VD.json` có thể mang một đối tượng `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - để các lựa chọn của bạn đi theo cùng bản sao lưu và có thể chỉnh sửa bằng tay. WebUI ghi cả đối tượng đó lẫn các tệp cờ (flag) mà các script khởi động đọc. `"spoof_version": "force"` bị từ chối từ tệp và bị hạ cấp: việc khôi phục một bản sao lưu cũ không được tự ý kích hoạt lại nó sau lưng bạn.  
### WebUI  
Không cần dùng WebUI nếu bạn chỉnh sửa trực tiếp tệp cấu hình JSON.  
Nếu bạn là người dùng Magisk, hãy dùng KsuWebUI của KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Dùng resetprop:  
Tắt việc sử dụng resetprop và chỉ bật giả mạo thông tin Build.  
#### Dùng ro.product.manufacturer:  
Tắt nếu bạn quan tâm đến việc phát hiện "Found device spoofing" trong ứng dụng dò root Disclosure.  

## Liên hệ

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
