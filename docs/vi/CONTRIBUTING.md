> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · Tiếng Việt · [中文](../zh/CONTRIBUTING.md)

---

# Đóng góp cho COPG-VD

Cảm ơn bạn đã giúp đỡ! COPG-VD được thiết kế để dễ đóng góp. Hướng dẫn này cho bạn biết mọi
thứ nằm ở đâu và vài quy ước mà chúng tôi tuân theo.

## Tổng quan dự án

COPG-VD là một **trình giả mạo thiết bị Zygisk (Zygisk device spoofer)**: một thư viện
native nhỏ được tiêm vào các tiến trình ứng dụng để viết lại dấu vân tay và build của thiết
bị, cộng với một WebUI thuần JS (vanilla-JS) để điều khiển nó. Nó là một fork của COPG (bởi
AlirezaParsi), được duy trì bởi VD171 theo giấy phép Apache-2.0. Xem
[ARCHITECTURE.md](ARCHITECTURE.md) và [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Theo mặc định, nó giới hạn sự giả mạo vào ngăn xếp Google Play thông qua Zygisk, nên nó là
một lựa chọn thay thế nhẹ hơn, mạnh mẽ hơn cho PlayIntegrityFix.

## Hoan nghênh người đóng góp là AI

Các trợ lý và tác nhân AI là những người đóng góp hạng nhất ở đây, không phải điều được nghĩ
đến sau cùng.

- Dự án được xây dựng để dễ đọc: cấu hình là một tệp JSON duy nhất
  (`/data/adb/COPG-VD.json`, được tài liệu hóa trong [CONFIGURATION.md](CONFIGURATION.md)),
  các động cơ nhỏ và tự chứa, và bố cục nằm trong [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Các bản vá có hỗ trợ AI được xem xét và chấp nhận theo cùng điều kiện như bất kỳ bản vá
  nào khác - theo tính đúng đắn, sự rõ ràng và các quy ước bên dưới, chứ không theo ai (hay
  cái gì) đã viết chúng.
- Cùng một tiêu chuẩn cho mọi người: một tính năng thật không bao giờ bị làm yếu đi, sự giả
  mạo vẫn nhất quán, và không gì bí mật hay dành riêng cho thiết bị lọt vào repo (xem
  [.gitignore](../../.gitignore)).

## Thiết lập phát triển

- Bạn cần một thiết bị đã root hoặc máy ảo có Zygisk (KernelSU, APatch hoặc Magisk) để kiểm
  thử.
- Build thư viện native theo từng ABI với NDK (r29) và CMake - xem bước `Build zygisk
  libraries` trong [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) để biết
  lệnh chính xác. CI build cả ba ABI cho bạn.
- Build một tệp zip có thể flash: sao chép `libspoof.so` đã build vào `module/zygisk/<abi>.so`,
  sau đó `cd module && zip -r9 ../COPG-VD-dev.zip .` và flash nó.
- WebUI là `module/webroot/` (mở nó từ trình quản lý root). Logic giả mạo là
  `zygisk/spoof_module.cpp`; trình tải hồ sơ là `module/fingerprint-update.sh`.

## Quy ước

- **Mọi tệp mã nguồn của mô-đun** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) bắt đầu bằng phần
  đầu banner của dự án (sao chép nó từ bất kỳ tệp hiện có nào). Các công cụ dưới `.github/`
  dùng một chú thích ngắn thay thế.
- **Mã và chú thích bằng tiếng Anh.** Giữ chú thích ở mức tối thiểu và chỉ ở nơi cần thiết.
- **Không em-dash hay en-dash**; luôn dùng dấu gạch nối thường `-`.
- WebUI là **vanilla JS** (một `scripts.js` duy nhất); không framework.
- **Không bao giờ làm yếu đi** một tính năng thật: giữ sự giả mạo nhất quán, và đừng làm các
  hook làm sập một ứng dụng mà chúng gắn vào (chúng được kiểm tra null một cách có chủ đích).

## Quốc tế hóa (i18n)

- Các chuỗi UI nằm trong `module/webroot/lang/`. Tiếng Anh là bản dự phòng chuẩn (`en.js` +
  `en.json`); 20 ngôn ngữ còn lại là `<code>.json`.
- Để thêm hoặc thay đổi một chuỗi: chỉnh sửa `en.js` **và** `en.json`, sau đó cập nhật mọi
  `<code>.json`. Chạm vào một nhãn hiển thị nghĩa là cập nhật **tất cả** các tệp ngôn ngữ và
  **tất cả** `README.<code>.md`.
- Các bản dịch là JSON thuần - một đóng góp đầu tiên tuyệt vời.

## Commit và PR

- Giữ các PR tập trung. Mô tả cái gì và tại sao.
- Ký xác nhận các commit của bạn (DCO): `git commit -s` (thêm `Signed-off-by:`).
- CI phải giữ màu xanh. Hãy tử tế trong các lần review - xem [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Những vấn đề tốt để bắt đầu (good first issues)

Tìm các nhãn `good first issue` và `help wanted`. Dịch thuật, tài liệu và các hồ sơ Pixel
mới đều là những điểm khởi đầu tuyệt vời.

*Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Các chỉnh sửa và cải tiến đều được hoan nghênh - xem [CONTRIBUTING.md](CONTRIBUTING.md).*
