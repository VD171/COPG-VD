> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · Português · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Agentes de IA: a superfície de controle

O COPG-VD acolhe contribuidores de IA e agentes, e o módulo inteiro foi feito para ser operado de forma
headless, sem fazer scraping da WebUI. Há duas superfícies, e um agente rodando como root (como a WebUI
faz) usa ambas:

1. **O arquivo de configuração** `/data/adb/COPG-VD/COPG-VD.json` - a única fonte da verdade. Cada campo
   de perfil e cada configuração mora aqui, ler e escrever este arquivo é como você muda o que o módulo
   falsifica.
2. **O ponto de entrada shell** `fingerprint-update.sh` - um único script com verbos estáveis para
   verificar, aplicar e buscar perfis.

## O arquivo de configuração

`/data/adb/COPG-VD/COPG-VD.json` é um objeto JSON simples. O módulo o lê a partir dos processos injetados
por meio de uma regra SELinux dedicada que ele mesmo entrega, ele não guarda nenhuma credencial. Um exemplo
incluído fica em `module/COPG-VD.json.example`, atualizado diariamente a partir da imagem de fábrica mais
recente do Google.

Regras que um agente deve seguir:

- **Strings usam apenas aspas duplas**, como no JSON.
- **Todo campo é opcional.** Um campo que não é fornecido é ignorado e o próprio valor da ROM é mantido.
- As chaves de nível superior que controlam o módulo são `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, o objeto `COPG-VD` (os campos Build),
  uma lista `COPG-VD-Delete` e um objeto `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_version`). A
  [Referência de configuração](CONFIGURATION.md) documenta cada uma delas.
- `"spoof_version": "force"` é recusado quando vem do arquivo em disco e é rebaixado na leitura, para que
  restaurar um backup antigo não possa rearmá-lo silenciosamente. Defina a política de versão pelas
  configurações, não escrevendo `force` à mão.
- Depois de editar o arquivo, rode **`analyze`** (abaixo): um arquivo que não faz parse faz o módulo não
  falsificar **nada**, e só o logcat avisa.

Uma config alterada chega aos apps no próximo início de processo. As propriedades entregues por `resetprop`
podem ser reaplicadas sem reboot (`service.sh --props-only`), mas os campos `android.os.Build.*` são escritos
pela biblioteca Zygisk quando o zygote inicia, então **um reboot é necessário** para que esses cheguem aos
apps.

## O contrato do shell

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

O script imprime linhas legíveis por humanos, as legíveis por máquina começam com `status:`. Seu código de
saída é `0` em caso de sucesso e diferente de zero em caso de falha.

| Verbo | O que faz | Saída típica |
|---|---|---|
| `check` | Compara o perfil instalado com o build upstream mais recente, não escreve nada. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Busca o perfil mais recente e o mescla na config (apenas os campos Build, suas outras chaves são preservadas). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Audita a config como ela está (parse, versão vs ROM, coerência do fingerprint, chaves desconhecidas, datas, props). Imprime um relatório, o código de saída reflete achados red/warn. | um relatório em texto |
| `fetch-index` | Baixa e verifica o índice de dispositivos assinado e o imprime (`index.json`). | o JSON do índice \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Baixa o `build.prop` de um dispositivo (o caminho vem do índice, ex.: `pixel-9a/latest.prop`) e escreve seus campos Build na config. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migra o estado/config do layout plano antigo para `/data/adb/COPG-VD/`. | - |
| `migrate` | Migração pontual de config entre versões do módulo. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | A auto-atualização uma vez por boot, destinada ao `service.sh`, não ao uso interativo. | escreve `update.status` |

Todo download é validado antes do uso (o único downloader no dispositivo é o busybox `wget`, que não consegue
validar TLS), e o atualizador de perfil nunca retrocede: um build upstream mais antigo do que o instalado é
recusado. O índice do feed e cada `.prop` carregam uma assinatura ed25519 destacada que é verificada antes de
o conteúdo ser lido.

## Fluxos típicos de agente

- **Manter o perfil atualizado:** `check`; se `status: update-available`, `apply`; depois reinicie para os
  novos `Build.*` chegarem aos apps.
- **Trocar para outro perfil Pixel:** `fetch-index`, escolha um caminho de dispositivo no índice, `fetch
  <path>`, rode `analyze` para confirmar que a config está coerente, então reinicie.
- **Mudar o escopo ou uma engine:** edite `scope_mode` (ou um interruptor de engine) no arquivo de
  configuração, rode `analyze`, então `service.sh --props-only` para mudanças entregues por propriedade, ou
  reinicie para os campos Build.

## Grades de segurança

- Mudar a config ou aplicar um perfil muda o que cada app alvo vê, confirme a intenção antes de escrever,
  como a WebUI faz.
- Nunca afrouxe uma proteção real de coerência: o SDK é limitado ao framework real sob qualquer política, o
  manufacturer fica em sintonia com o resto do perfil, e um perfil de outro dispositivo é recusado. Isso é
  deliberado e não deve ser contornado.
- A config é a superfície suportada. Não faça scraping nem automatize a própria WebUI.

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas, veja [CONTRIBUTING.md](CONTRIBUTING.md)._
