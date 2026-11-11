> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · 한국어 · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# 보안 정책

COPG-VD는 root로 실행되며 Zygisk를 통해 앱 프로세스에 주입됩니다. 우리는 보안을 진지하게
받아들입니다.

## 취약점 보고

- **사이트:** https://vd171.ru
- **사이트:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/COPG-VD/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA 스레드:** https://xdaforums.com/t/COPG-VD.4807698/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

명확한 설명과, 가능하면 재현 단계를 포함하세요. 가능한 한 빨리 응답하고, 원하시면 당신을
크레딧하겠습니다.

## 스코프 참고 사항

- 구성은 `/data/adb/COPG-VD/COPG-VD.json`에 있으며 root만 읽을 수 있습니다. 모듈은 자체적으로 함께
  제공하는 전용 SELinux 규칙을 통해 주입된 프로세스에서 그것을 읽습니다; 자격 증명이나 패스프레이즈를
  보유하지 않습니다.
- 스푸핑 후크는 라이브 앱에 붙어 있고 null 체크되어 있어, 잘못된 프로파일이 앱을 충돌시키는 대신
  우아하게 저하됩니다.
- 선택적인 프로파일 가져오기를 제외하고 **텔레메트리도 네트워크도 없습니다**. 그 가져오기는
  [github.com/VictorGabriel7Dev/build.prop](https://github.com/VictorGabriel7Dev/build.prop)에서
  HTTPS를 통해 공개 Pixel 프로파일을 다운로드하며, `PATH`의 `curl`/`wget`이 아니라 모듈 자체의 번들
  다운로더를 사용합니다.
- 모든 사전 빌드된 바이너리와 라이브러리는 고정된 공개 upstream까지 추적 가능하며, 당신이 검사할 수
  있는 소스로부터 CI에서 빌드됩니다.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171에 의해 유지 관리됩니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.*
