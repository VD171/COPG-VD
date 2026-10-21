## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD là một trình giả mạo thiết bị: nó ghi lại fingerprint và build của thiết bị để các ứng dụng thấy thiết bị bạn chọn thay vì thiết bị thật.  
Nó chạy trên Zygisk (KernelSU, APatch hoặc Magisk) và theo mặc định, giới hạn phạm vi giả mạo vào ngăn xếp Google Play - do đó nó là một giải pháp thay thế nhẹ hơn và bền bỉ hơn cho PlayIntegrityFix.  

## Ảnh chụp màn hình

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Cách sử dụng?
Cài đặt module, khởi động lại, và hồ sơ đi kèm (một chiếc Pixel) được giả mạo cho các ứng dụng mục tiêu. Với một fingerprint hoạt động được, bạn không cần PlayIntegrityFix hay GooglePhotosUnlimited.  
Mọi thứ được cấu hình trong `/data/adb/COPG-VD.json`, hoặc từ WebUI. Tất cả các trường đều TÙY CHỌN - một trường không được cung cấp sẽ bị bỏ qua.  

### Scope - ai thấy sự giả mạo
`scope_mode` quyết định tiến trình nào nhận được danh tính giả mạo. Trong một chế độ có giới hạn phạm vi, danh tính được Zygisk cung cấp theo từng tiến trình và không bị rò rỉ ra phần còn lại của hệ thống qua các global properties.  
* **Google Play** (`playstore`, mặc định) - chỉ ngăn xếp Play (Google Play services, tiến trình unstable của nó và Play Store).  
* **Global** - toàn bộ thiết bị; mọi tiến trình đều thấy nó.  
* **Whitelist** - chỉ các ứng dụng trong `scope_whitelist`.  
* **Blacklist** - mọi ứng dụng trừ những ứng dụng trong `scope_blacklist`.  

### Engines - sự giả mạo được cung cấp như thế nào
Mỗi engine là độc lập và có thể tắt:  
* **Build fields (JNI)** - ghi lại `android.os.Build.*` trong các tiến trình mục tiêu.  
* **Property hook** - trình bày các thuộc tính hệ thống giả mạo cho các tiến trình mục tiêu (một bản ánh xạ lại vùng thuộc tính theo từng tiến trình kiểu clean-room, không hook hàm).  
* **resetprop** - ghi lại các thuộc tính hệ thống, được quản lý theo nhóm: identity, version, boot state, SELinux, adb/usb, anti-emulator và một lượt dọn dẹp. Trong một chế độ có giới hạn phạm vi, các nhóm identity và version nằm ngoài resetprop trên toàn thiết bị (Zygisk cung cấp chúng theo từng tiến trình); các nhóm boot/lock/SELinux vẫn mang tính global.  
* **DRM / Widevine** (mặc định tắt) - báo cáo một mức bảo mật Widevine được chọn, L1 hoặc L3, cho các ứng dụng đọc nó.  

### Fields - set, empty, delete hoặc skip
Bên trong đối tượng `COPG-VD`, mỗi trường Build có bốn trạng thái:  
* **Set** - `"KEY": "value"` ghi giá trị.  
* **Empty** - `"KEY": ""` ghi một giá trị rỗng.  
* **Delete** - liệt kê khóa trong `"COPG-VD-Delete": [ ... ]` ở cấp cao nhất để loại bỏ nó (một trường Build trở thành null, một thuộc tính bị loại bỏ bằng `resetprop --delete`).  
* **Skip** - bỏ khóa ra hoàn toàn; giá trị của chính ROM được giữ lại.  

Một danh sách `"global_fields": [ ... ]` áp dụng các trường Build được nêu tên trên toàn thiết bị ngay cả trong một chế độ có giới hạn phạm vi, để giữ cho một giá trị nhất quán ở mọi nơi - chỉ dành cho các trường an toàn về tính nhất quán (ví dụ bản vá bảo mật), không bao giờ dành cho identity và không bao giờ dành cho nhóm phiên bản Android.  

### Example JSON config file
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
Hãy chắc chắn chỉ dùng chuỗi trong dấu ngoặc kép.  
Khối ở trên và `module/COPG-VD.json.example` được làm mới hằng ngày bởi quy trình [Update COPG-VD.json](.github/workflows/update-json.yml), lấy trực tiếp từ ảnh factory mới nhất của Google.  

### Giữ cho fingerprint luôn mới
`fingerprint-update.sh` tải tệp đó về và cập nhật cấu hình của bạn, từ WebUI (**Check Update** / **Update Now**) hoặc tự động **mỗi lần khởi động một lần** (**Auto-update JSON on boot**, bật theo mặc định).  
* Cả `/data/adb/COPG-VD.json` lẫn `/data/adb/modules/COPG-VD/COPG-VD.json` đều được cập nhật khi cả hai cùng tồn tại, và nội dung trước đó được giữ lại dưới dạng `.bak`.  
* Chỉ các trường build được ghi lại (fingerprint, ID, incremental, timestamp, bản vá bảo mật, SDK, UUID, host, user). Mọi thứ khác mà bạn đã tùy chỉnh đều được giữ nguyên: các khóa bổ sung, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, các đối tượng khác, thứ tự khóa và định dạng.  
* Nó không bao giờ lùi về sau: một bản build thượng nguồn cũ hơn bản đã cài sẽ bị từ chối. Đây là chuyện thường tình (repo có thể tụt lại sau một cấu hình bạn đã cập nhật bằng tay) và cũng là lớp bảo vệ quan trọng nhất trên Android, nơi trình tải xuống duy nhất có sẵn là busybox `wget`, vốn không thể xác thực chứng chỉ TLS - vì cùng lý do đó, mọi giá trị đều được xác thực trước khi sử dụng.  
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

### WebUI
WebUI là tùy chọn - mọi thứ đều có thể chỉnh sửa trực tiếp trong tệp cấu hình JSON - nhưng nó là cách dễ dàng để điều khiển module. Nó có năm tab: **About**, **Device** (mọi trường, đặt theo từng trạng thái, nhóm theo danh mục), **Spoofing** (scope và engines), **System** (các nhóm resetprop) và **Tools** (Analyze, Check Update, Update Now, Backup/Restore và tự động cập nhật khi khởi động). Nó không thực hiện yêu cầu mạng nào; mọi thứ nó cần đều đi kèm bên trong module.  
Nếu bạn là người dùng Magisk, hãy dùng KsuWebUI của KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Cài đặt trong cấu hình
`COPG-VD.json` mang các cài đặt của nó ngay cạnh hồ sơ, để các lựa chọn của bạn đi theo cùng bản sao lưu và có thể chỉnh sửa bằng tay: `scope_mode`, các công tắc của engine, các nhóm resetprop, `global_fields`, và một đối tượng `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). WebUI ghi cả cấu hình lẫn các tệp cờ (flag) mà các script khởi động đọc. `"spoof_version": "force"` bị từ chối từ tệp và bị hạ cấp: việc khôi phục một bản sao lưu cũ không được tự ý kích hoạt lại nó sau lưng bạn.  

## Liên hệ

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
