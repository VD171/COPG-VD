> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · Tiếng Việt · [中文](../zh/AI-AGENTS.md)

---

# Tác nhân AI: bề mặt điều khiển

COPG-VD hoan nghênh những người đóng góp là AI và tác nhân, và toàn bộ module được xây dựng để điều
khiển không cần giao diện, mà không scrape WebUI. Có hai bề mặt, và một tác nhân chạy với quyền root
(như WebUI vẫn làm) sử dụng cả hai:

1. **Tệp cấu hình** `/data/adb/COPG-VD/COPG-VD.json` - nguồn chân lý duy nhất. Mọi trường hồ sơ và mọi
   thiết lập đều nằm ở đây, đọc và ghi tệp này là cách bạn thay đổi những gì module giả mạo.
2. **Điểm vào shell** `fingerprint-update.sh` - một script với các động từ ổn định để kiểm tra, áp dụng
   và lấy các hồ sơ.

## Tệp cấu hình

`/data/adb/COPG-VD/COPG-VD.json` là một đối tượng JSON thuần. Module đọc nó từ các tiến trình được tiêm
thông qua một quy tắc SELinux chuyên dụng mà chính nó đi kèm, nó không chứa thông tin xác thực nào. Một
ví dụ đi kèm nằm ở `module/COPG-VD.json.example`, được làm mới hằng ngày từ image factory mới nhất của
Google.

Các quy tắc mà một tác nhân phải tuân theo:

- **Chuỗi chỉ dùng dấu ngoặc kép**, như trong JSON.
- **Mọi trường đều tùy chọn.** Một trường không được cung cấp sẽ bị bỏ qua và giá trị riêng của ROM được
  giữ lại.
- Các khóa cấp cao nhất điều khiển module là `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, đối tượng `COPG-VD` (các trường
  Build), một danh sách `COPG-VD-Delete` và một đối tượng `COPG-VD-Settings` (`resetprop`, `autoupdate`,
  `spoof_version`). [Tài liệu tham khảo cấu hình](CONFIGURATION.md) ghi lại từng mục.
- `"spoof_version": "force"` bị từ chối khi nó đến từ tệp trên đĩa và bị hạ cấp khi đọc, nên việc khôi
  phục một bản sao lưu cũ không thể âm thầm kích hoạt lại nó. Hãy đặt chính sách phiên bản thông qua các
  thiết lập, chứ không phải bằng cách tự viết tay `force`.
- Sau khi chỉnh sửa tệp, hãy chạy **`analyze`** (bên dưới): một tệp không phân tích được sẽ khiến module
  giả mạo **không gì cả**, và chỉ logcat mới cho biết điều đó.

Một cấu hình đã thay đổi sẽ đến các ứng dụng ở lần khởi động tiến trình tiếp theo. Các thuộc tính được
cung cấp qua `resetprop` có thể được áp dụng lại mà không cần khởi động lại (`service.sh --props-only`),
nhưng các trường `android.os.Build.*` được ghi bởi thư viện Zygisk khi zygote khởi động, nên **cần khởi
động lại** để chúng đến được các ứng dụng.

## Hợp đồng shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Script in ra các dòng mà con người đọc được, những dòng máy đọc được bắt đầu bằng `status:`. Mã thoát
của nó là `0` khi thành công và khác không khi thất bại.

| Động từ | Nó làm gì | Đầu ra điển hình |
|---|---|---|
| `check` | So sánh hồ sơ đã cài với bản build upstream mới nhất, không ghi gì cả. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Lấy hồ sơ mới nhất và hợp nhất nó vào cấu hình (chỉ các trường build, các khóa khác của bạn được giữ nguyên). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Kiểm tra cấu hình ở trạng thái hiện tại (phân tích, phiên bản so với ROM, tính nhất quán của fingerprint, khóa không xác định, ngày tháng, props). In ra một báo cáo, mã thoát phản ánh các phát hiện red/warn. | một báo cáo văn bản |
| `fetch-index` | Tải xuống và xác minh chỉ mục thiết bị đã ký rồi in ra (`index.json`). | JSON chỉ mục \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Tải xuống `build.prop` của một thiết bị (đường dẫn từ chỉ mục, ví dụ `pixel-9a/latest.prop`) và ghi các trường build của nó vào cấu hình. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Di chuyển trạng thái/cấu hình từ bố cục phẳng cũ sang `/data/adb/COPG-VD/`. | - |
| `migrate` | Di chuyển cấu hình một lần giữa các phiên bản module. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Bản tự cập nhật một lần mỗi lần khởi động, dành cho `service.sh`, không dùng tương tác. | ghi `update.status` |

Mọi lượt tải xuống đều được xác thực trước khi dùng (trình tải xuống duy nhất trên thiết bị là busybox
`wget`, vốn không thể xác thực TLS), và trình cập nhật hồ sơ không bao giờ đi lùi: một bản build upstream
cũ hơn bản đã cài sẽ bị từ chối. Chỉ mục nguồn cấp và mỗi `.prop` mang một chữ ký ed25519 tách rời được
xác minh trước khi nội dung được đọc.

## Các luồng tác nhân điển hình

- **Giữ hồ sơ luôn mới:** `check`; nếu `status: update-available`, `apply`; rồi khởi động lại để
  `Build.*` mới đến được các ứng dụng.
- **Chuyển sang một hồ sơ Pixel khác:** `fetch-index`, chọn một đường dẫn thiết bị từ chỉ mục, `fetch
  <path>`, chạy `analyze` để xác nhận cấu hình nhất quán, rồi khởi động lại.
- **Thay đổi phạm vi hoặc một engine:** chỉnh sửa `scope_mode` (hoặc một công tắc engine) trong tệp cấu
  hình, chạy `analyze`, rồi `service.sh --props-only` cho các thay đổi được cung cấp qua thuộc tính, hoặc
  khởi động lại cho các trường Build.

## Lan can an toàn

- Thay đổi cấu hình hoặc áp dụng một hồ sơ sẽ thay đổi những gì mỗi ứng dụng mục tiêu thấy, hãy xác nhận
  ý định trước khi ghi, như WebUI vẫn làm.
- Không bao giờ nới lỏng một bộ bảo vệ tính nhất quán thật sự: SDK bị giới hạn ở framework thật dưới mọi
  chính sách, nhà sản xuất luôn đồng bộ với phần còn lại của hồ sơ, và một hồ sơ dành cho thiết bị khác
  sẽ bị từ chối. Những điều này là cố ý và không được phép bỏ qua.
- Cấu hình là bề mặt được hỗ trợ. Không scrape hoặc tự động hóa chính WebUI.

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến, xem [CONTRIBUTING.md](CONTRIBUTING.md)._
