<!--
  COPG-VD: global device spoofer: spoof your device fingerprint and build.
  Copyright (C) 2026  AlirezaParsi & VD171. SPDX-License-Identifier: Apache-2.0 (Fork by VD171)
-->

# COPG-VD

<p align="center">
  <img src="images/logo-wordmark.png" alt="COPG-VD" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/COPG-VD?label=release&color=2ee89d" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/COPG-VD/releases"><img src="https://img.shields.io/github/downloads/VD171/COPG-VD/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/COPG-VD/stargazers"><img src="https://img.shields.io/github/stars/VD171/COPG-VD?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>Một trình giả mạo thiết bị: nó ghi lại fingerprint và build của thiết bị để các ứng dụng thấy thiết bị bạn chọn thay vì thiết bị thật.</b><br>
  Nó chạy trên Zygisk (KernelSU, APatch hoặc Magisk) và theo mặc định, giới hạn phạm vi giả mạo vào ngăn xếp Google Play: một giải pháp thay thế nhẹ hơn và bền bỉ hơn cho PlayIntegrityFix.
</p>

<p align="center">
  <a href="https://github.com/VD171/COPG-VD/releases">Releases</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/vi-Home">Wiki</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/vi-USER-GUIDE">Hướng dẫn sử dụng</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/vi-CONFIGURATION">Tham chiếu cấu hình</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/vi-ARCHITECTURE">Kiến trúc</a> ·
  <a href="https://github.com/VD171/COPG-VD/wiki/vi-FILE-STRUCTURE">Cấu trúc tệp</a> ·
  <a href="https://xdaforums.com/t/COPG-VD.4807698/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

---

## Cách sử dụng?
Cài đặt module, khởi động lại, và hồ sơ đi kèm (một chiếc Pixel) được giả mạo cho các ứng dụng mục tiêu. Với một fingerprint hoạt động được, bạn không cần PlayIntegrityFix hay GooglePhotosUnlimited.  
Mọi thứ được cấu hình trong `/data/adb/COPG-VD/COPG-VD.json`, hoặc từ WebUI. Tất cả các trường đều TÙY CHỌN: một trường không được cung cấp sẽ bị bỏ qua.  

### Scope: ai thấy sự giả mạo
`scope_mode` quyết định tiến trình nào nhận được danh tính giả mạo. Trong một chế độ có giới hạn phạm vi, danh tính được Zygisk cung cấp theo từng tiến trình và không bị rò rỉ ra phần còn lại của hệ thống qua các global properties.  
* **Google Play** (`playstore`, mặc định): chỉ ngăn xếp Play (Google Play services, tiến trình unstable của nó và Play Store).  
* **Global**: toàn bộ thiết bị; mọi tiến trình đều thấy nó.  
* **Whitelist**: chỉ các ứng dụng trong `scope_whitelist`.  
* **Blacklist**: mọi ứng dụng trừ những ứng dụng trong `scope_blacklist`.  

### Engines: sự giả mạo được cung cấp như thế nào
Mỗi engine là độc lập và có thể tắt:  
* **Build fields (JNI)**: ghi lại `android.os.Build.*` trong các tiến trình mục tiêu.  
* **Property hook**: trình bày các thuộc tính hệ thống giả mạo cho các tiến trình mục tiêu (một bản ánh xạ lại vùng thuộc tính theo từng tiến trình kiểu clean-room, không hook hàm).  
* **resetprop**: ghi lại các thuộc tính hệ thống, được quản lý theo nhóm: identity, version, boot state, SELinux, adb/usb, anti-emulator và một lượt dọn dẹp. Trong một chế độ có giới hạn phạm vi, các nhóm identity và version nằm ngoài resetprop trên toàn thiết bị (Zygisk cung cấp chúng theo từng tiến trình); các nhóm boot/lock/SELinux vẫn mang tính global.  
* **DRM / Widevine** (mặc định tắt): báo cáo một mức bảo mật Widevine được chọn, L1 hoặc L3, cho các ứng dụng đọc nó. Theo mặc định nó tuân theo phạm vi ở trên; đặt `drm_targets` (một danh sách ứng dụng) để áp dụng giả mạo DRM chỉ cho những ứng dụng đó, độc lập với `scope_mode`: mô-đun vẫn được tải trong một ứng dụng được liệt kê chỉ để phục vụ DRM hook, ngay cả khi ứng dụng đó nằm ngoài phạm vi chính. Trống hoặc không có nghĩa là tuân theo phạm vi. (Yêu cầu một chế độ có phạm vi, không phải Global.)  

### Fields: set, empty, delete hoặc skip
Bên trong đối tượng `COPG-VD`, mỗi trường Build có bốn trạng thái:  
* **Set**: `"KEY": "value"` ghi giá trị.  
* **Empty**: `"KEY": ""` ghi một giá trị rỗng.  
* **Delete**: liệt kê khóa trong `"COPG-VD-Delete": [ ... ]` ở cấp cao nhất để loại bỏ nó (một trường Build trở thành null, một thuộc tính bị loại bỏ bằng `resetprop --delete`).  
* **Skip**: bỏ khóa ra hoàn toàn; giá trị của chính ROM được giữ lại.  

Một danh sách `"global_fields": [ ... ]` áp dụng các trường Build được nêu tên trên toàn thiết bị ngay cả trong một chế độ có giới hạn phạm vi, để giữ cho một giá trị nhất quán ở mọi nơi: chỉ dành cho các trường an toàn về tính nhất quán (ví dụ bản vá bảo mật), không bao giờ dành cho identity và không bao giờ dành cho nhóm phiên bản Android.  

### Example JSON config file
`/data/adb/COPG-VD/COPG-VD.json`
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
Hãy chắc chắn chỉ dùng chuỗi trong dấu ngoặc kép.  
Khối ở trên và `module/COPG-VD.json.example` được làm mới hằng ngày bởi quy trình [Update COPG-VD.json](.github/workflows/update-json.yml), lấy trực tiếp từ ảnh factory mới nhất của Google.  

### Giữ cho fingerprint luôn mới
`fingerprint-update.sh` tải tệp đó về và cập nhật cấu hình của bạn, từ WebUI (**Check Update** / **Update Now**) hoặc tự động **mỗi lần khởi động một lần** (**Auto-update JSON on boot**, bật theo mặc định).  
* `/data/adb/COPG-VD/COPG-VD.json` được cập nhật tại chỗ, và nội dung trước đó được giữ lại ngay bên cạnh dưới dạng `COPG-VD.json.bak`.  
* Chỉ các trường build được ghi lại (fingerprint, ID, incremental, timestamp, bản vá bảo mật, SDK, UUID, host, user). Mọi thứ khác mà bạn đã tùy chỉnh đều được giữ nguyên: các khóa bổ sung, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, các đối tượng khác, thứ tự khóa và định dạng.  
* Nó không bao giờ lùi về sau: một bản build thượng nguồn cũ hơn bản đã cài sẽ bị từ chối. Đây là chuyện thường tình (repo có thể tụt lại sau một cấu hình bạn đã cập nhật bằng tay) và cũng là lớp bảo vệ quan trọng nhất trên Android, nơi trình tải xuống duy nhất có sẵn là busybox `wget`, vốn không thể xác thực chứng chỉ TLS: vì cùng lý do đó, mọi giá trị đều được xác thực trước khi sử dụng.  
* Nếu hồ sơ của bạn giả mạo **một thiết bị khác** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` khác), sẽ không có gì được áp dụng: một fingerprint Pixel trên một hồ sơ khác còn tệ hơn một fingerprint cũ.  
* Khi khởi động, nó chạy trong nền và tiếp tục thử lại trong khoảng 10 phút, vì wifi thường chưa hoạt động khi quá trình khởi động hoàn tất. Nó không bao giờ làm chậm quá trình khởi động.  
* `resetprop` được áp dụng lại ngay sau một lần cập nhật, nhưng `android.os.Build` được ghi bởi module zygisk khi zygote khởi động: **khởi động lại** để các giá trị mới đến được với các ứng dụng.  
* Nhật ký tại `/data/adb/COPG-VD/update.log`.  

### Phiên bản Android: và vì sao nó không bị giả mạo
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` và `CODENAME` mô tả **ROM của bạn**, không phải thiết bị đang bị giả mạo. Việc nói với các ứng dụng rằng SDK mới hơn framework thực tế khiến chúng gọi những API không tồn tại: các ứng dụng của Google bị sập, điện thoại khởi động lại, rồi lặp lại từ đầu. Bản thân quá trình khởi động vẫn hoàn tất, nên đây là một **softloop** và không có gì hiện ra trong nhật ký khởi động.  
* Chúng không nằm trong cấu hình đi kèm và trình cập nhật không bao giờ ghi chúng.  
* **Spoof Android version** trong WebUI quyết định liệu chúng có được áp dụng hay không:  
  * **Never** (mặc định): dùng chính phiên bản của ROM.  
  * **Up to this ROM**: chỉ những gì không vượt quá nó, mà trên thực tế nghĩa là hạ thấp SDK.  
  * **Force**: đúng y như cấu hình quy định. Đây chính là thứ gây ra softloop.  
* Phiên bản thật được đọc từ `/system/build.prop`, không bao giờ từ `getprop`: vì đó chính là thứ mà module này làm giả.  

### Analyze
**Analyze** trong WebUI (hoặc `fingerprint-update.sh analyze`) kiểm tra cấu hình ở trạng thái hiện tại: phiên bản so với ROM, liệu tệp còn phân tích cú pháp được hay không (một tệp hỏng khiến module giả mạo **không gì cả**, và chỉ logcat mới cho biết điều đó), liệu fingerprint có khớp với các trường xung quanh hay không, các khóa mà module không đọc, các ngày tháng, và liệu các prop đã mang sẵn những gì cấu hình yêu cầu hay chưa.  

### WebUI
WebUI là tùy chọn (mọi thứ đều có thể chỉnh sửa trực tiếp trong tệp cấu hình JSON) nhưng nó là cách dễ dàng để điều khiển module. Nó có năm tab: **About**, **Device** (mọi trường, đặt theo từng trạng thái, nhóm theo danh mục), **Spoofing** (scope và engines), **System** (các nhóm resetprop) và **Tools** (Analyze, Check Update, Update Now, Backup/Restore và tự động cập nhật khi khởi động). Nó không thực hiện yêu cầu mạng nào; mọi thứ nó cần đều đi kèm bên trong module.  
Nếu bạn là người dùng Magisk, hãy dùng KsuWebUI của KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Cài đặt trong cấu hình
`COPG-VD.json` mang các cài đặt của nó ngay cạnh hồ sơ, để các lựa chọn của bạn đi theo cùng bản sao lưu và có thể chỉnh sửa bằng tay: `scope_mode`, các công tắc của engine, các nhóm resetprop, `global_fields`, và một đối tượng `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_version`). Mọi thứ đều nằm trong một tệp duy nhất này: các script khởi động và WebUI đọc các cài đặt trực tiếp từ nó, nên các lựa chọn của bạn vẫn còn sau một lần cập nhật module. `"spoof_version": "force"` bị từ chối từ tệp và bị hạ cấp: việc khôi phục một bản sao lưu cũ không được tự ý kích hoạt lại nó sau lưng bạn.  

<!-- vd-docs -->
## Tài liệu

- **[Wiki](https://github.com/VD171/COPG-VD/wiki/vi-Home)**: tài liệu đầy đủ, có thể xem trực tuyến.
- **[Hướng dẫn sử dụng](https://github.com/VD171/COPG-VD/wiki/vi-USER-GUIDE)**: cách cài đặt, WebUI và sử dụng hàng ngày.
- **[Tham chiếu cấu hình](https://github.com/VD171/COPG-VD/wiki/vi-CONFIGURATION)**: mọi thiết lập trong tệp cấu hình và chức năng của nó.
- **[Kiến trúc](https://github.com/VD171/COPG-VD/wiki/vi-ARCHITECTURE)** và **[Cấu trúc tệp](https://github.com/VD171/COPG-VD/wiki/vi-FILE-STRUCTURE)**: cách spoofing hoạt động và mọi thứ nằm ở đâu.

<!-- /vd-docs -->

## See also

Các dự án cùng tác giả:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: một trình gỡ lỗi phương thức thiết bị, đọc từng mục qua mọi phương thức có thể đọc được nó và so sánh chúng cạnh nhau.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: các dịch vụ Google của bạn (RCS, Wallet, chứng thực Play Integrity), đọc trên thiết bị của bạn mà không cần internet.
- **[VDBackup](https://github.com/VD171/VD-Backup)**: sao lưu và khôi phục toàn bộ ứng dụng và dữ liệu với quyền root, điều khiển hoàn toàn từ WebUI.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: một SSH daemon độc lập chạy với quyền root (Dropbear).

Pixel `build.prop`: **[@VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)** (fork of @T3SL4).

## Contacts

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/COPG-VD.4807698/
* **GitHub:** @VD171 https://github.com/VD171

## License

**Apache-2.0**: xem [LICENSE](LICENSE). COPG-VD là một bản fork bởi VD171 của COPG gốc bởi AlirezaParsi, được tiếp tục dưới cùng một giấy phép.

## Trademarks

COPG-VD là một dự án độc lập, không chính thức. Nó không liên kết với, không được chứng thực bởi, cũng không được tài trợ bởi Google LLC. "Google", "Google Play", "Play Integrity", "Pixel", "Android" cùng các tên gọi và logo liên quan là thương hiệu của Google LLC. COPG-VD chạy hoàn toàn trên thiết bị của bạn.

## Tags

`Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
