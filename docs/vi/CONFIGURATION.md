> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · [Português](../pt/CONFIGURATION.md) · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · Tiếng Việt · [中文](../zh/CONFIGURATION.md)

---

# Tham chiếu cấu hình

Toàn bộ mô-đun được điều khiển bởi một tệp: `/data/adb/COPG-VD/COPG-VD.json`. WebUI ghi nó cho bạn,
nhưng bạn có thể chỉnh sửa bằng tay. Một ví dụ đi kèm nằm tại `module/COPG-VD.json.example`.
Đây là nguồn chân lý duy nhất; bản sao nằm trong thư mục module chỉ là một mặc định chỉ đọc.
Một cấu hình còn sót lại từ một phiên bản cũ tại `/data/adb/COPG-VD.json` sẽ tự động được chuyển vào
thư mục này. Nhật ký và trạng thái của riêng module (`update.log`, `update.state`) cũng nằm ở đây.

Quy tắc:

- **Chuỗi chỉ dùng dấu ngoặc kép**, như trong JSON.
- **Mọi trường đều tùy chọn.** Một trường không được cung cấp sẽ bị bỏ qua và giá trị của
  chính ROM được giữ lại.
- Chạy **Analyze** sau khi chỉnh sửa bằng tay: một tệp không phân tích cú pháp được khiến
  mô-đun giả mạo **không gì cả**, và chỉ logcat mới nói ra.

## Các khóa cấp cao nhất

| Khóa | Kiểu | Ý nghĩa |
|---|---|---|
| `scope_mode` | string | `playstore` (mặc định), `global`, `whitelist` hoặc `blacklist`. Xem [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Các gói nhận được sự giả mạo khi `scope_mode` là `whitelist`. |
| `scope_blacklist` | array | Các gói bị loại trừ khi `scope_mode` là `blacklist`. |
| `COPG-VD` | object | Hồ sơ: các trường Build cần trình bày (xem bên dưới). |
| `COPG-VD-Delete` | array | Tên các trường cần xóa thay vì đặt (trường Build trở thành null; một thuộc tính bị xóa bằng `resetprop --delete`). |
| `COPG-VD-Settings` | object | Các thiết lập mô-đun đi cùng với hồ sơ (xem bên dưới). |
| `motor_jni` | bool | Động cơ trường Build (viết lại `android.os.Build.*`). Mặc định `true`. |
| `motor_prop_hook` | bool | Động cơ thuộc tính theo từng tiến trình (ánh xạ lại thuộc tính kiểu clean-room). Mặc định `true`. |
| `motor_drm` | bool | Động cơ DRM / Widevine. Mặc định `false`. |
| `drm_targets` | array | Các ứng dụng nhận được giả mạo DRM bất kể `scope_mode`. Trống = tuân theo phạm vi. |
| `global_fields` | array | Các trường Build được áp dụng trên toàn thiết bị ngay cả trong chế độ có phạm vi, chỉ dành cho các trường an toàn về tính nhất quán. |
| `process_overrides` | object | Ghi đè trường theo từng tiến trình: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Chi tiết logcat bổ sung để gỡ lỗi. Mặc định `false`. |

## Đối tượng hồ sơ `COPG-VD`

Mỗi mục là một trường thiết bị được trình bày cho các tiến trình được nhắm tới. Các trường
thông dụng:

| Nhóm | Các trường |
|---|---|
| Identity | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Attestation | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Version (đặc biệt) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

Các biến thể `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) cho phép
đường dẫn attestation báo cáo một giá trị khác với giá trị thông thường, để keystore vẫn
nhất quán.

> **Nhóm version là đặc biệt.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` và `CODENAME` mô tả
> ROM của bạn, không phải thiết bị được giả mạo. Nâng chúng lên sẽ làm điện thoại softloop.
> Chúng không có trong hồ sơ đi kèm và chỉ áp dụng khi `COPG-VD-Settings.spoof_version` cho
> phép - xem [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Trạng thái của trường

| Trạng thái | Cách làm | Kết quả |
|---|---|---|
| Set | `"KEY": "value"` | Ghi giá trị. |
| Empty | `"KEY": ""` | Ghi một giá trị rỗng. |
| Delete | tên trong `"COPG-VD-Delete": [ ... ]` | Xóa trường. |
| Skip | bỏ khóa ra ngoài | Giữ giá trị của chính ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` hoặc `L3`) là mức Widevine được báo cáo khi `motor_drm` bật.

## `COPG-VD-Settings`

Các thiết lập đi cùng với hồ sơ, nên một bản sao lưu mang theo các lựa chọn của bạn.

| Khóa | Kiểu / giá trị | Ý nghĩa |
|---|---|---|
| `resetprop` | bool | Liệu động cơ resetprop toàn thiết bị có chạy không. |
| `autoupdate` | bool | Liệu `fingerprint-update.sh` có chạy một lần mỗi lần khởi động không. Mặc định bật. |
| `spoof_manufacturer` | bool | Liệu trường manufacturer có được giả mạo hay không. |
| `spoof_version` | `never` / `rom` / `force` | Cách nhóm phiên bản Android được áp dụng. `never` là mặc định; `force` bị từ chối khi khôi phục một bản sao lưu. |

## `global_fields`

Các trường Build trong danh sách này được áp dụng trên toàn thiết bị ngay cả trong chế độ
có phạm vi, để giữ một giá trị nhất quán ở mọi nơi. Chỉ dùng nó cho các trường an toàn về
tính nhất quán - security patch là trường thường dùng. **Không bao giờ** đặt identity hoặc
nhóm phiên bản Android ở đây.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Ví dụ

```json
{
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.261016.008/16754936:user/release-keys",
    "PRODUCT": "tegu_beta",
    "SECURITY_PATCH": "2026-11-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "drm_targets": [],
  "global_fields": ["SECURITY_PATCH"],
  "process_overrides": {},
  "COPG-VD-Settings": { "autoupdate": true, "spoof_version": "never" }
}
```

*Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Các chỉnh sửa và cải tiến đều được hoan nghênh - xem [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến; xem [CONTRIBUTING.md](CONTRIBUTING.md)._
