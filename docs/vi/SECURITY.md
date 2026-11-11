> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · Tiếng Việt · [中文](../zh/SECURITY.md)

---

# Chính sách bảo mật

COPG-VD chạy với quyền root và được tiêm vào các tiến trình ứng dụng thông qua Zygisk. Chúng
tôi xem trọng vấn đề bảo mật.

## Báo cáo một lỗ hổng

- **Trang web:** https://vd171.ru
- **Trang web:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Chủ đề XDA:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Hãy kèm theo một mô tả rõ ràng và, nếu có thể, các bước để tái hiện. Chúng tôi sẽ phản hồi
sớm nhất có thể và ghi nhận công lao của bạn nếu bạn muốn.

## Ghi chú về phạm vi

- Cấu hình nằm tại `/data/adb/COPG-VD/COPG-VD.json`, chỉ root mới đọc được. Mô-đun đọc nó từ tiến
  trình được tiêm thông qua một quy tắc SELinux chuyên dụng mà chính nó đi kèm; nó không giữ
  thông tin xác thực (credential) hay cụm mật khẩu nào.
- Các hook giả mạo được gắn vào các ứng dụng đang chạy và được kiểm tra null để một hồ sơ
  sai định dạng suy giảm nhẹ nhàng thay vì làm sập ứng dụng.
- **Không có telemetry và không có mạng** ngoại trừ việc tải hồ sơ tùy chọn, vốn tải xuống
  một hồ sơ Pixel công khai qua HTTPS từ
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)
  bằng trình tải xuống đi kèm của riêng mô-đun, không phải một `curl`/`wget` từ `PATH`.
- Mọi tệp nhị phân và thư viện được biên dịch sẵn đều có thể truy nguyên về một thượng nguồn
  (upstream) công khai được ghim, và được build trong CI từ mã nguồn mà bạn có thể kiểm tra.

*Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Các chỉnh sửa và cải tiến đều được hoan nghênh - xem [CONTRIBUTING.md](CONTRIBUTING.md).*
