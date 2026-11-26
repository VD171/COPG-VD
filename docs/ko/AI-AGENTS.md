> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · 한국어 · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI 에이전트: 제어 표면

COPG-VD는 AI 및 에이전트 기여자를 환영하며, 모듈 전체가 WebUI를 스크래핑하지 않고 헤드리스로 구동되도록
만들어졌습니다. 두 개의 표면이 있고, root로 실행되는 에이전트(= WebUI가 하는 방식)는 둘 다 사용합니다:

1. **구성 파일** `/data/adb/COPG-VD/COPG-VD.json` - 유일한 진실의 원천. 모든 프로필 필드와 모든 설정이
   여기에 있으며, 이 파일을 읽고 쓰는 것이 모듈이 위조하는 내용을 바꾸는 방법입니다.
2. **shell 진입점** `fingerprint-update.sh` - 프로필을 확인, 적용, 가져오기 위한 안정적인 동사를 가진 단일
   스크립트.

## 구성 파일

`/data/adb/COPG-VD/COPG-VD.json`은 평범한 JSON 객체입니다. 모듈은 자신이 직접 포함한 전용 SELinux 규칙을
통해 주입된 프로세스에서 이 파일을 읽습니다, 어떤 자격 증명도 담지 않습니다. 포함된 예시는
`module/COPG-VD.json.example`에 있으며, Google의 최신 공장 이미지로부터 매일 갱신됩니다.

에이전트가 반드시 따라야 할 규칙:

- **문자열은 큰따옴표만 사용**, JSON에서처럼.
- **모든 필드는 선택 사항입니다.** 제공되지 않은 필드는 건너뛰어지고 ROM 자체의 값이 유지됩니다.
- 모듈을 조종하는 최상위 키는 `scope_mode`, `scope_whitelist`, `scope_blacklist`, `motor_drm`,
  `drm_targets`, `global_fields`, `process_overrides`, `COPG-VD` 객체(빌드 필드), `COPG-VD-Delete` 목록,
  그리고 `COPG-VD-Settings` 객체(`resetprop`, `autoupdate`, `spoof_version`)입니다.
  [설정 레퍼런스](CONFIGURATION.md)가 각각을 문서화합니다.
- `"spoof_version": "force"`는 디스크의 파일에서 올 때 거부되며 읽을 때 낮춰지므로, 오래된 백업을
  복원해도 조용히 다시 활성화할 수 없습니다. 버전 정책은 `force`를 손으로 쓰지 말고 설정을 통해 지정하세요.
- 파일을 편집한 후에는 **`analyze`**(아래)를 실행하세요: parse되지 않는 파일은 모듈이 **아무것도** 위조하지
  않게 만들며, logcat만이 그 사실을 알려줍니다.

변경된 구성은 다음 프로세스 시작 시 앱에 도달합니다. `resetprop`로 전달되는 속성은 reboot 없이 다시 적용할
수 있지만(`service.sh --props-only`), `android.os.Build.*` 필드는 zygote가 시작될 때 Zygisk 라이브러리에
의해 쓰이므로, 그 값이 앱에 도달하려면 **reboot가 필요합니다**.

## shell 계약

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

스크립트는 사람이 읽을 수 있는 줄을 출력합니다, 기계가 읽을 수 있는 줄은 `status:`로 시작합니다. 종료 코드는
성공 시 `0`, 실패 시 0이 아닙니다.

| 동사 | 하는 일 | 일반적인 출력 |
|---|---|---|
| `check` | 설치된 프로필을 최신 upstream 빌드와 비교하며, 아무것도 쓰지 않습니다. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | 최신 프로필을 가져와 구성에 병합합니다(빌드 필드만, 당신의 다른 키는 보존됩니다). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | 현재 상태의 구성을 감사합니다(parse, 버전 대 ROM, fingerprint 일관성, 알 수 없는 키, 날짜, props). 보고서를 출력하며, 종료 코드는 red/warn 발견을 반영합니다. | 텍스트 보고서 |
| `fetch-index` | 서명된 기기 색인을 다운로드·검증하고 출력합니다(`index.json`). | 색인 JSON \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | 한 기기의 `build.prop`을 다운로드하고(경로는 색인에서, 예: `pixel-9a/latest.prop`) 그 빌드 필드를 구성에 씁니다. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | 상태/구성을 예전의 평평한 레이아웃에서 `/data/adb/COPG-VD/`로 마이그레이션합니다. | - |
| `migrate` | 모듈 버전 간 일회성 구성 마이그레이션. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | 부팅당 한 번의 자동 업데이트, `service.sh`용이며 대화형 사용을 위한 것이 아닙니다. | `update.status`를 씁니다 |

모든 다운로드는 사용 전에 검증되며(기기 내 유일한 다운로더는 busybox `wget`로, TLS를 검증할 수 없습니다),
프로필 업데이터는 결코 거꾸로 가지 않습니다: 설치된 것보다 오래된 upstream 빌드는 거부됩니다. 피드 색인과 각
`.prop`은 분리된 ed25519 서명을 담고 있으며, 내용을 읽기 전에 검증됩니다.

## 일반적인 에이전트 흐름

- **프로필을 최신으로 유지:** `check`; `status: update-available`이면 `apply`; 그런 다음 새 `Build.*`가
  앱에 도달하도록 재부팅하세요.
- **다른 Pixel 프로필로 전환:** `fetch-index`, 색인에서 기기 경로를 고르고, `fetch <path>`, 구성이
  일관적인지 확인하기 위해 `analyze`를 실행한 다음 재부팅하세요.
- **범위 또는 엔진 변경:** 구성 파일에서 `scope_mode`(또는 엔진 스위치)를 편집하고, `analyze`를 실행한 다음,
  속성으로 전달되는 변경에는 `service.sh --props-only`를, 빌드 필드에는 재부팅을 사용하세요.

## 안전 가드레일

- 구성을 바꾸거나 프로필을 적용하면 모든 대상 앱이 보는 것이 바뀝니다, WebUI가 하듯이 쓰기 전에 의도를
  확인하세요.
- 실제 일관성 보호 장치를 결코 느슨하게 하지 마세요: SDK는 어떤 정책에서도 실제 프레임워크로 제한되고,
  manufacturer는 프로필의 나머지와 보조를 맞추며, 다른 기기의 프로필은 거부됩니다. 이것들은 의도적이며
  우회해서는 안 됩니다.
- 구성이 지원되는 표면입니다. WebUI 자체를 스크래핑하거나 자동화하지 마세요.

<!-- doc-footer -->

---

> _이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 유지 관리합니다. 수정 및 개선을 환영합니다. [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요._
