> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · [Português](../pt/USER-GUIDE.md) · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · Tiếng Việt · [中文](../zh/USER-GUIDE.md)

---

# Hướng dẫn sử dụng

COPG-VD viết lại dấu vân tay (fingerprint) và build của thiết bị để các ứng dụng bạn chọn
thấy một chiếc Pixel thay vì thiết bị thật của bạn. Hướng dẫn này đưa bạn từ lúc cài đặt
đến một cấu hình hoạt động và qua các lựa chọn trên đường đi. Để biết mọi trường và giá
trị, xem [CONFIGURATION.md](CONFIGURATION.md); để biết cách nó hoạt động bên trong, xem
[ARCHITECTURE.md](ARCHITECTURE.md).

## Cài đặt

1. Flash tệp zip trong KernelSU, APatch hoặc Magisk và khởi động lại.
2. Zygisk phải được kích hoạt (tích hợp sẵn, hoặc ReZygisk / Zygisk Next). Người dùng
   Magisk: bật Zygisk.
3. Mô-đun đi kèm một hồ sơ Pixel, nên ngay sau khi khởi động lại, ngăn xếp Google Play đã
   thấy chiếc Pixel đó. Với một dấu vân tay hoạt động, bạn không cần PlayIntegrityFix hay
   GooglePhotosUnlimited.

Mở WebUI từ trình quản lý root của bạn để điều khiển mô-đun. Người dùng Magisk mở nó bằng
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Mọi thứ cũng
có thể được chỉnh sửa trực tiếp trong `/data/adb/COPG-VD/COPG-VD.json`.

## Ai thấy sự giả mạo (phạm vi)

`scope_mode` quyết định tiến trình nào nhận được danh tính giả. Trong một chế độ có phạm
vi, danh tính được chuyển giao theo từng tiến trình bởi Zygisk và **không** bị rò rỉ ra
phần còn lại của hệ thống thông qua các thuộc tính toàn cục.

| Chế độ | Ai nhận được sự giả mạo |
|---|---|
| `playstore` (mặc định) | Chỉ ngăn xếp Play: Google Play services, tiến trình không ổn định của nó và Play Store. |
| `global` | Toàn bộ thiết bị: mọi tiến trình. |
| `whitelist` | Chỉ các ứng dụng được liệt kê trong `scope_whitelist`. |
| `blacklist` | Mọi ứng dụng trừ những ứng dụng trong `scope_blacklist`. |

Hãy bắt đầu với `playstore`. Đây là tùy chọn nhẹ nhất và là tùy chọn vượt qua Play
Integrity mà không để lộ sự giả mạo cho các ứng dụng không liên quan.

## Các động cơ

Mỗi động cơ đều độc lập và có thể tắt. Tất cả đều bật theo mặc định trừ DRM.

- **Các trường Build (`motor_jni`)** - viết lại `android.os.Build.*` trong các tiến trình
  được nhắm tới. Đây là thứ mà hầu hết ứng dụng đọc.
- **Property hook (`motor_prop_hook`)** - trình bày các thuộc tính hệ thống giả cho các
  tiến trình được nhắm tới, thông qua việc ánh xạ lại (remap) vùng thuộc tính theo từng
  tiến trình kiểu clean-room (không hook hàm).
- **resetprop** - viết lại các thuộc tính hệ thống trên toàn thiết bị, theo nhóm (identity,
  version, boot state, SELinux, adb/usb, anti-emulator, và một lượt dọn dẹp). Trong một chế
  độ có phạm vi, các nhóm identity và version nằm ngoài lượt áp dụng toàn thiết bị (Zygisk
  chuyển giao chúng theo từng tiến trình); các nhóm boot, lock và SELinux vẫn ở mức toàn
  cục. Bật/tắt nó trong `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, tắt theo mặc định)** - báo cáo một mức bảo mật Widevine
  được chọn (L1 hoặc L3) cho các ứng dụng đọc nó. Xem phần DRM bên dưới.

## Giữ dấu vân tay luôn mới

Một dấu vân tay sẽ cũ đi: Google xoay vòng các factory image, và một dấu vân tay cũ dần mất
giá trị. `fingerprint-update.sh` giữ cho dấu vân tay của bạn luôn cập nhật, từ factory image
mới nhất của Google.

- Từ WebUI (tab Tools): **Check Update** và **Update Now**.
- Tự động, **một lần mỗi lần khởi động**: **Auto-update JSON on boot** (bật theo mặc định).
  Nó chạy ở nền, tiếp tục thử lại trong khoảng mười phút vì wifi thường chưa sẵn sàng khi
  khởi động, và không bao giờ làm chậm quá trình khởi động.
- Nó chỉ viết lại các trường build (fingerprint, ID, incremental, timestamp, security patch,
  SDK, UUID, host, user). Mọi thứ bạn tùy chỉnh đều được giữ lại, và nội dung trước đó được
  lưu dưới dạng `.bak`.
- Nó không bao giờ lùi lại (một build thượng nguồn cũ hơn sẽ bị từ chối), và nếu hồ sơ của
  bạn giả mạo một thiết bị khác thì nó không áp dụng gì cả - một dấu vân tay Pixel trên một
  hồ sơ khác còn tệ hơn một dấu vân tay cũ.
- `resetprop` được áp dụng lại ngay sau một lần cập nhật, nhưng `android.os.Build` được ghi
  khi zygote khởi động, nên hãy **khởi động lại** để các giá trị mới đến được với ứng dụng.
  Nhật ký: `/data/adb/COPG-VD/update.log`.

## Cái bẫy phiên bản Android

Điều khó làm đúng nhất. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` và `CODENAME` mô tả **ROM
của bạn**, không phải thiết bị bạn giả mạo. Nói với ứng dụng rằng SDK mới hơn so với
framework thực tế khiến chúng gọi các API không tồn tại: các ứng dụng của Google bị sập,
điện thoại khởi động lại, và nó bắt đầu lại từ đầu. Bản thân quá trình khởi động hoàn tất,
nên đây là một **softloop** không để lại gì trong nhật ký khởi động.

Các trường này không có trong cấu hình đi kèm và trình cập nhật không bao giờ ghi chúng.
**Spoof Android version** (`COPG-VD-Settings.spoof_version`) quyết định liệu chúng có được
áp dụng hay không:

- `never` (mặc định) - phiên bản của chính ROM được sử dụng.
- `rom` - chỉ áp dụng những gì không vượt quá ROM, trong thực tế có nghĩa là hạ thấp SDK.
- `force` - áp dụng chính xác những gì cấu hình nói. Đây là thứ gây ra softloop; chỉ sử
  dụng nó nếu bạn biết framework mục tiêu hỗ trợ nó.

Phiên bản thật được đọc từ `/system/build.prop`, không bao giờ từ `getprop` (chính là thứ
mà mô-đun này làm giả). `force` cũng bị từ chối khi khôi phục một bản sao lưu, nên một bản
sao lưu cũ không thể kích hoạt lại nó sau lưng bạn.

## DRM / Widevine

Tắt theo mặc định (`motor_drm`). Khi bật, nó báo cáo một mức Widevine được chọn,
`DRM_SECURITY_LEVEL` (`L1` hoặc `L3`), cho các ứng dụng đọc nó.

Theo mặc định, sự giả mạo DRM tuân theo `scope_mode`. Để áp dụng nó cho một tập hợp ứng
dụng cụ thể thay vào đó - độc lập với phạm vi chính - hãy liệt kê chúng trong `drm_targets`.
Khi đó mô-đun vẫn được nạp trong một ứng dụng đã liệt kê **chỉ** cho hook DRM, ngay cả khi
ứng dụng đó nằm ngoài phạm vi chính; một danh sách trống hoặc không có nghĩa là tuân theo
phạm vi. Điều này cần một chế độ có phạm vi (không phải `global`), và có hiệu lực vào lần
**khởi động lại** tiếp theo.

## Analyze: kiểm tra cấu hình của bạn

**Analyze** trong WebUI (hoặc `fingerprint-update.sh analyze`) kiểm toán cấu hình như nó
đang là và cho bạn biết điều gì sai trước khi một ứng dụng phát hiện ra:

- phiên bản so với ROM (liệu nó có softloop không?),
- liệu tệp còn phân tích cú pháp được không (một tệp hỏng khiến mô-đun giả mạo **không gì
  cả**, và chỉ logcat mới nói ra điều đó),
- liệu dấu vân tay có nhất quán với các trường xung quanh nó không,
- các khóa mà mô-đun không đọc, các ngày đáng ngờ, và liệu các thuộc tính đang hoạt động đã
  mang những gì cấu hình yêu cầu hay chưa.

Chạy nó bất cứ khi nào bạn chỉnh sửa cấu hình bằng tay.

## WebUI

Tùy chọn, nhưng là cách dễ dàng để điều khiển mọi thứ. Năm tab:

- **About** - thông tin mô-đun và phiên bản.
- **Device** - mọi trường build, được đặt theo từng trạng thái và nhóm theo danh mục.
- **Spoofing** - chế độ phạm vi và các công tắc động cơ.
- **System** - các nhóm resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, tự động cập nhật khi khởi
  động, và báo cáo Diagnostics (một nút để đọc và xuất mọi thứ hữu ích cho một báo cáo lỗi).

Nó không thực hiện yêu cầu mạng nào; mọi thứ nó cần đều đi kèm bên trong mô-đun.

## Khắc phục sự cố

- **Một ứng dụng vẫn thấy thiết bị thật.** Kiểm tra phạm vi: trong `playstore` chỉ ngăn xếp
  Play được bao phủ. Xác nhận cấu hình phân tích cú pháp được (chạy Analyze). Sau khi thay
  đổi các động cơ, `drm_targets` hoặc hồ sơ, hãy **khởi động lại** - Zygisk đọc phạm vi khi
  zygote khởi động.
- **Play Integrity vẫn thất bại.** Đảm bảo dấu vân tay còn mới (Check Update) và rằng
  `SECURITY_PATCH` nằm trong `global_fields` để nó duy trì nhất quán trên toàn thiết bị.
  Kết thúc Google Play services để nó chứng thực lại.
- **Điện thoại softloop sau khi bật giả mạo phiên bản.** Đó là cái bẫy phiên bản Android ở
  trên - đặt `spoof_version` trở lại `never`.
- **WebUI không mở trên Magisk.** Dùng [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Các chỉnh sửa và cải tiến đều được hoan nghênh - xem [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến; xem [CONTRIBUTING.md](CONTRIBUTING.md)._
