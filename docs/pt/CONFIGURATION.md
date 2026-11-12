> **Languages:** [English](../CONFIGURATION.md) · [العربية](../ar/CONFIGURATION.md) · [Čeština](../cs/CONFIGURATION.md) · [Deutsch](../de/CONFIGURATION.md) · [Español](../es/CONFIGURATION.md) · [فارسی](../fa/CONFIGURATION.md) · [Français](../fr/CONFIGURATION.md) · [हिन्दी](../hi/CONFIGURATION.md) · [Bahasa Indonesia](../in/CONFIGURATION.md) · [Italiano](../it/CONFIGURATION.md) · [日本語](../ja/CONFIGURATION.md) · [한국어](../ko/CONFIGURATION.md) · [Nederlands](../nl/CONFIGURATION.md) · [Polski](../pl/CONFIGURATION.md) · Português · [Русский](../ru/CONFIGURATION.md) · [Svenska](../sv/CONFIGURATION.md) · [ไทย](../th/CONFIGURATION.md) · [Türkçe](../tr/CONFIGURATION.md) · [Tiếng Việt](../vi/CONFIGURATION.md) · [中文](../zh/CONFIGURATION.md)

---

# Referência de configuração

O módulo inteiro é controlado por um único arquivo: `/data/adb/COPG-VD/COPG-VD.json`. A WebUI o escreve por
você, mas você pode editá-lo à mão. Um exemplo enviado fica em `module/COPG-VD.json.example`.
Esta é a única fonte da verdade; a cópia dentro do diretório do módulo é apenas um padrão somente leitura.
Uma configuração que sobrou de uma versão mais antiga em `/data/adb/COPG-VD.json` é movida automaticamente
para este diretório. O próprio log e o estado do módulo (`update.log`, `update.state`) também ficam aqui.

Regras:

- **Strings usam apenas aspas duplas**, como no JSON.
- **Todo campo é opcional.** Um campo que não é fornecido é ignorado e o próprio
  valor da ROM é mantido.
- Rode o **Analyze** depois de editar à mão: um arquivo que não faz parse faz o módulo não falsificar
  **nada**, e só o logcat avisa.

## Chaves de nível superior

| Chave | Tipo | Significado |
|---|---|---|
| `scope_mode` | string | `playstore` (padrão), `global`, `whitelist` ou `blacklist`. Veja [USER-GUIDE.md](USER-GUIDE.md). |
| `scope_whitelist` | array | Pacotes que recebem o spoof quando `scope_mode` é `whitelist`. |
| `scope_blacklist` | array | Pacotes excluídos quando `scope_mode` é `blacklist`. |
| `COPG-VD` | object | O perfil: os campos de Build a apresentar (veja abaixo). |
| `COPG-VD-Delete` | array | Nomes de campos a remover em vez de definir (o campo de Build vira null; uma propriedade é removida com `resetprop --delete`). |
| `COPG-VD-Settings` | object | Configurações do módulo que viajam com o perfil (veja abaixo). |
| `motor_jni` | bool | Motor de campos de Build (reescreve `android.os.Build.*`). Padrão `true`. |
| `motor_prop_hook` | bool | Motor de propriedades por processo (remapeamento clean-room de propriedades). Padrão `true`. |
| `motor_drm` | bool | Motor DRM / Widevine. Padrão `false`. |
| `drm_targets` | array | Apps que recebem o spoof de DRM independentemente do `scope_mode`. Vazio = segue o escopo. |
| `global_fields` | array | Campos de Build aplicados em todo o dispositivo mesmo em um modo com escopo, apenas para campos seguros quanto à coerência. |
| `process_overrides` | object | Sobrescritas de campos por processo: `{ "process.name": { "FIELD": "value" } }`. |
| `verbose_logs` | bool | Detalhe extra de logcat para depuração. Padrão `false`. |

## O objeto de perfil `COPG-VD`

Cada entrada é um campo de dispositivo apresentado aos processos alvo. Os mais comuns:

| Grupo | Campos |
|---|---|
| Identidade | `BRAND`, `DEVICE`, `MANUFACTURER`, `MODEL`, `PRODUCT`, `FINGERPRINT`, `BOARD`, `HARDWARE` |
| Build id | `DISPLAY`, `ID`, `INCREMENTAL`, `TIMESTAMP`, `TIME`, `HOST`, `USER`, `TYPE`, `TAGS`, `BOOTLOADER` |
| Atestação | `SECURITY_PATCH`, `FIRST_API_LEVEL`, `DEVICE_INITIAL_SDK_INT`, `UUID`, `SDK_FINGERPRINT` |
| Versão (especial) | `ANDROID_VERSION`, `RELEASE`, `SDK_INT`, `SDK`, `SDK_FULL`, `CODENAME`, `PREVIEW_SDK` |

As variantes `*_FOR_ATTESTATION` (`BRAND_FOR_ATTESTATION`, `DEVICE_FOR_ATTESTATION`,
`MANUFACTURER_FOR_ATTESTATION`, `MODEL_FOR_ATTESTATION`, `PRODUCT_FOR_ATTESTATION`) permitem que o caminho de
atestação reporte um valor diferente do valor comum, para que o keystore permaneça
coerente.

> **O grupo de versão é especial.** `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME`
> descrevem a sua ROM, não o dispositivo falsificado. Elevá-los causa softloop no telefone. Eles não estão
> no perfil enviado e só se aplicam quando `COPG-VD-Settings.spoof_version` permite -
> veja [USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

### Estados dos campos

| Estado | Como | Resultado |
|---|---|---|
| Definir | `"KEY": "value"` | Escreve o valor. |
| Vazio | `"KEY": ""` | Escreve um valor vazio. |
| Remover | nome em `"COPG-VD-Delete": [ ... ]` | Remove o campo. |
| Pular | deixe a chave de fora | Mantém o próprio valor da ROM. |

### DRM

`DRM_SECURITY_LEVEL` (`L1` ou `L3`) é o nível Widevine reportado quando `motor_drm` está ligado.

## `COPG-VD-Settings`

Configurações que viajam com o perfil, para que um backup carregue as suas escolhas.

| Chave | Tipo / valores | Significado |
|---|---|---|
| `resetprop` | bool | Se o motor resetprop de todo o dispositivo roda. |
| `autoupdate` | bool | Se o `fingerprint-update.sh` roda uma vez por boot. Padrão ligado. |
| `spoof_manufacturer` | bool | Se o campo do fabricante também é falsificado. |
| `spoof_version` | `never` / `rom` / `force` | Como o grupo de versão do Android se aplica. `never` é o padrão; `force` é recusado ao restaurar um backup. |

## `global_fields`

Os campos de Build nesta lista são aplicados em todo o dispositivo mesmo em um modo com escopo, para manter um valor
consistente em todo lugar. Use-a apenas para campos seguros quanto à coerência - o security patch é o
usual. **Nunca** coloque identidade ou o grupo de versão do Android aqui.

```json
"global_fields": ["SECURITY_PATCH"]
```

## Exemplo

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

*Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._
