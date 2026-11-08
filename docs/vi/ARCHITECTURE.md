> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · Tiếng Việt · [中文](../zh/ARCHITECTURE.md)

---

# Kiến trúc

COPG-VD là một mô-đun Zygisk: một thư viện native nhỏ (`libspoof.so`) mà trình nạp Zygisk
tiêm vào zygote và, từ đó, vào các tiến trình ứng dụng. Tất cả những gì nó làm là trình bày
một danh tính thiết bị được chọn cho các tiến trình bạn nhắm tới. Không có ứng dụng và,
ngoài việc tải hồ sơ tùy chọn, không có mạng.

## Vòng đời

1. **Zygote khởi động.** Khi zygote khởi động, trình nạp gọi `onLoad` của mô-đun. Nó đọc
   `/data/adb/COPG-VD.json` một lần: cấu hình phạm vi và hồ sơ.
2. **App fork.** Với mỗi ứng dụng mà zygote fork, mô-đun quyết định trong `preAppSpecialize`
   liệu tiến trình này có trong phạm vi hay không:
   - **trong phạm vi chính** (`playstore` / `global` / `whitelist` / `blacklist`), hoặc
   - **trong phạm vi DRM** (được liệt kê trong `drm_targets`).
   Nếu không thuộc cả hai, mô-đun **tách ra** (`dlclose`) khỏi tiến trình đó và không để lại
   dấu vết nào trong nó.
3. **Specialize.** Với một tiến trình ở lại, các động cơ áp dụng trong `postAppSpecialize`,
   khi tiến trình vẫn còn đặc quyền.

Vì các fork kế thừa bản sao bộ nhớ copy-on-write của zygote, mỗi ứng dụng bắt đầu từ cấu
hình được đọc lúc khởi động. Mô-đun đọc lại tệp theo từng tiến trình được nhắm tới chỉ khi
nó thực sự thay đổi, nên một ứng dụng vừa khởi động hoặc mở lại sẽ nhận được hồ sơ đã chỉnh
sửa - nhưng quyết định về phạm vi thì được đưa ra lúc zygote khởi động, nên **thay đổi phạm
vi, các động cơ hoặc `drm_targets` cần khởi động lại**.

## Các động cơ

Mỗi động cơ đều độc lập và có thể bật/tắt.

- **Các trường Build (`motor_jni`).** Viết lại `android.os.Build.*` (và `Build.VERSION.*`)
  trong tiến trình được nhắm tới thông qua JNI, nên mã Java đọc các giá trị giả.
- **Property hook (`motor_prop_hook`).** Trình bày các thuộc tính hệ thống giả cho tiến
  trình thông qua việc ánh xạ lại vùng thuộc tính theo từng tiến trình kiểu clean-room
  (`prop_virtualizer`). Đó là một ánh xạ lại bộ nhớ, không phải hook hàm, nên không có dấu
  vết hàm bị hook.
- **resetprop (toàn thiết bị).** Ghi các thuộc tính hệ thống theo nhóm - identity, version,
  boot state, SELinux, adb/usb, anti-emulator, cộng với một lượt dọn dẹp. Các script khởi
  động chạy nó. Trong một chế độ có phạm vi, các nhóm identity và version được bỏ ra (Zygisk
  chuyển giao chúng theo từng tiến trình); các nhóm boot, lock và SELinux vẫn ở mức toàn cục
  để thiết bị nhất quán.
- **DRM / Widevine (`motor_drm`).** Hook các phương thức `MediaDrm` báo cáo mức bảo mật
  Widevine (`getSecurityLevel`, `getPropertyString`) và trả về mức đã cấu hình. Các hook
  được kiểm tra null, nên một hồ sơ sai định dạng sẽ suy giảm một cách nhẹ nhàng thay vì làm
  sập ứng dụng. `drm_targets` cho phép động cơ này chạy trên danh sách ứng dụng riêng của
  nó, tách rời khỏi phạm vi chính.

## Đọc cấu hình

Tiến trình được tiêm chạy trong miền SELinux của zygote, mà theo mặc định không thể truy
cập `/data/adb`. Mô-đun đi kèm `sepolicy.rule` của riêng nó để cho phép điều đó, và, như một
phương án dự phòng, có thể đọc cấu hình thông qua thư mục mô-đun đang mở của nó
(`getModuleDir`), nên nó vẫn hoạt động ngay cả khi một bản build Zygisk ngừng cấp quyền cho
đường dẫn. Tệp được phân tích cú pháp bằng một trình phân tích JSON nhúng nhỏ (`jsmn`); một
tệp không phân tích cú pháp được nghĩa là mô-đun giả mạo không gì cả.

## Giữ hồ sơ luôn mới

`fingerprint-update.sh` làm mới các trường build từ factory image mới nhất của Google, từ
WebUI hoặc một lần mỗi lần khởi động. Nó sử dụng trình tải xuống đi kèm của riêng mô-đun
(không phải một `curl`/`wget` từ `PATH`), xác thực mọi giá trị trước khi dùng, không bao giờ
lùi lại, và từ chối một hồ sơ giả mạo một thiết bị khác. `android.os.Build` được ghi lúc
zygote khởi động, nên các giá trị mới đến được với ứng dụng vào lần khởi động lại tiếp theo.
Xem [USER-GUIDE.md](USER-GUIDE.md) cho phía người dùng và [CONFIGURATION.md](CONFIGURATION.md)
cho các trường.

## Tại sao phiên bản Android không được giả mạo theo mặc định

Nâng `SDK_INT` / `ANDROID_VERSION` lên cao hơn framework thực tế của ROM khiến các ứng dụng
gọi các API không tồn tại, điều này làm sập các ứng dụng của Google và khởi động lại điện
thoại vào một softloop. Nhóm version do đó tắt theo mặc định và bị kiểm soát sau
`spoof_version`. Mô-đun đọc phiên bản thật từ `/system/build.prop`, không bao giờ từ
`getprop`, bởi vì `getprop` chính là thứ nó làm giả. Xem cái bẫy trong
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Các chỉnh sửa và cải tiến đều được hoan nghênh - xem [../CONTRIBUTING.md](CONTRIBUTING.md).*
