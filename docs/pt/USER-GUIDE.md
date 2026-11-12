> **Languages:** [English](../USER-GUIDE.md) · [العربية](../ar/USER-GUIDE.md) · [Čeština](../cs/USER-GUIDE.md) · [Deutsch](../de/USER-GUIDE.md) · [Español](../es/USER-GUIDE.md) · [فارسی](../fa/USER-GUIDE.md) · [Français](../fr/USER-GUIDE.md) · [हिन्दी](../hi/USER-GUIDE.md) · [Bahasa Indonesia](../in/USER-GUIDE.md) · [Italiano](../it/USER-GUIDE.md) · [日本語](../ja/USER-GUIDE.md) · [한국어](../ko/USER-GUIDE.md) · [Nederlands](../nl/USER-GUIDE.md) · [Polski](../pl/USER-GUIDE.md) · Português · [Русский](../ru/USER-GUIDE.md) · [Svenska](../sv/USER-GUIDE.md) · [ไทย](../th/USER-GUIDE.md) · [Türkçe](../tr/USER-GUIDE.md) · [Tiếng Việt](../vi/USER-GUIDE.md) · [中文](../zh/USER-GUIDE.md)

---

# Guia do usuário

O COPG-VD reescreve o fingerprint e o build do dispositivo para que os apps que você escolher vejam um Pixel
em vez do seu dispositivo real. Este guia leva você da instalação a uma configuração funcional e
pelas escolhas no caminho. Para cada campo e valor, veja [CONFIGURATION.md](CONFIGURATION.md);
para entender como funciona por dentro, veja [ARCHITECTURE.md](ARCHITECTURE.md).

## Instalação

1. Faça o flash do zip no KernelSU, APatch ou Magisk e reinicie.
2. O Zygisk precisa estar ativo (integrado, ou ReZygisk / Zygisk Next). Usuários do Magisk: ativem o Zygisk.
3. O módulo já vem com um perfil Pixel, então logo após a reinicialização a stack do Google Play
   já vê esse Pixel. Com um fingerprint funcional você não precisa do PlayIntegrityFix nem do
   GooglePhotosUnlimited.

Abra a WebUI pelo seu gerenciador de root para controlar o módulo. Usuários do Magisk a abrem com o
[KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases). Tudo
também pode ser editado diretamente em `/data/adb/COPG-VD/COPG-VD.json`.

## Quem vê o spoof (escopo)

`scope_mode` decide quais processos recebem a identidade falsificada. Em um modo com escopo, a
identidade é entregue por processo pelo Zygisk e **não** vaza para o resto do
sistema por meio de propriedades globais.

| Modo | Quem recebe o spoof |
|---|---|
| `playstore` (padrão) | Apenas a stack do Play: Google Play services, seu processo instável e a Play Store. |
| `global` | O dispositivo inteiro: todos os processos. |
| `whitelist` | Apenas os apps listados em `scope_whitelist`. |
| `blacklist` | Todos os apps exceto os que estão em `scope_blacklist`. |

Comece com `playstore`. É a opção mais leve e a que passa no Play Integrity
sem expor o spoof a apps não relacionados.

## Os motores

Cada motor é independente e pode ser desligado. Todos vêm ligados por padrão, exceto o DRM.

- **Campos de Build (`motor_jni`)** - reescreve `android.os.Build.*` nos processos
  alvo. É o que a maioria dos apps lê.
- **Hook de propriedades (`motor_prop_hook`)** - apresenta as propriedades de sistema falsificadas aos
  processos alvo, por meio de um remapeamento clean-room da área de propriedades por processo (sem
  hook de função).
- **resetprop** - reescreve as propriedades de sistema em todo o dispositivo, por grupo (identidade,
  versão, estado de boot, SELinux, adb/usb, anti-emulador e uma passada de limpeza). Em um modo com
  escopo, os grupos de identidade e versão ficam de fora da passada em todo o dispositivo (o Zygisk os entrega
  por processo); os grupos boot, lock e SELinux permanecem globais. Alterne em
  `COPG-VD-Settings.resetprop`.
- **DRM / Widevine (`motor_drm`, desligado por padrão)** - reporta um nível de segurança Widevine
  escolhido (L1 ou L3) aos apps que o leem. Veja a seção DRM abaixo.

## Mantendo o fingerprint atualizado

Um fingerprint envelhece: o Google rotaciona as imagens de fábrica, e um antigo vai perdendo valor.
O `fingerprint-update.sh` mantém o seu atual, a partir da imagem de fábrica Google mais recente.

- Pela WebUI (aba Tools): **Check Update** e **Update Now**.
- Sozinho, **uma vez por boot**: **Auto-update JSON on boot** (ligado por padrão). Roda em
  segundo plano, segue tentando por cerca de dez minutos porque o wifi geralmente ainda não está ativo
  no boot, e nunca atrasa o boot.
- Reescreve apenas os campos de build (fingerprint, ID, incremental, timestamp, security
  patch, SDK, UUID, host, user). Tudo o que você personalizou é mantido, e o conteúdo anterior
  é salvo como `.bak`.
- Nunca retrocede (um build de upstream mais antigo é recusado), e se o seu perfil falsifica
  um dispositivo diferente, nada é aplicado - um fingerprint Pixel em outro perfil é pior
  do que um antigo.
- O `resetprop` é reaplicado logo após uma atualização, mas `android.os.Build` é escrito quando o
  zygote inicia, então **reinicie** para que os novos valores cheguem aos apps. Log:
  `/data/adb/COPG-VD/update.log`.

## A armadilha da versão do Android

A coisa mais difícil de acertar. `ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME`
descrevem **a sua ROM**, não o dispositivo que você falsifica. Dizer aos apps que o SDK é mais novo do que o
framework realmente é faz com que eles chamem APIs que não existem: os apps do Google travam, o
telefone reinicia, e tudo recomeça. O boot em si se completa, então é um **softloop** que
não deixa nada nos logs de boot.

Esses campos não estão na configuração enviada e o atualizador nunca os escreve. **Spoof
Android version** (`COPG-VD-Settings.spoof_version`) decide se eles são aplicados:

- `never` (padrão) - a própria versão da ROM é usada.
- `rom` - aplica apenas o que não excede a ROM, o que na prática significa abaixar o SDK.
- `force` - aplica exatamente o que a configuração diz. É isso que causa o softloop; use-o
  somente se você souber que o framework alvo o suporta.

A versão real é lida de `/system/build.prop`, nunca do `getprop` (que é justamente
aquilo que este módulo falsifica). `force` também é recusado ao restaurar um backup, de modo que um
backup antigo não possa rearmá-lo pelas suas costas.

## DRM / Widevine

Desligado por padrão (`motor_drm`). Quando ligado, reporta um nível Widevine escolhido,
`DRM_SECURITY_LEVEL` (`L1` ou `L3`), aos apps que o leem.

Por padrão, o spoof de DRM segue o `scope_mode`. Para aplicá-lo a um conjunto específico de apps
em vez disso - independentemente do escopo principal - liste-os em `drm_targets`. O módulo então
permanece carregado em um app listado **apenas** para o hook de DRM, mesmo quando esse app está fora do
escopo principal; uma lista vazia ou ausente significa seguir o escopo. Isso requer um modo com escopo (não
`global`), e passa a valer na próxima **reinicialização**.

## Analyze: verifique sua configuração

**Analyze** na WebUI (ou `fingerprint-update.sh analyze`) audita a configuração como ela
está e diz o que está errado antes que um app o faça:

- a versão em relação à ROM (ela causaria softloop?),
- se o arquivo ainda faz parse (um quebrado faz o módulo não falsificar **nada**, e só o
  logcat avisaria),
- se o fingerprint concorda com os campos ao seu redor,
- chaves que o módulo não lê, datas suspeitas e se as propriedades ativas já
  carregam o que a configuração pede.

Rode sempre que editar a configuração à mão.

## A WebUI

Opcional, mas a forma fácil de controlar tudo. Cinco abas:

- **About** - informações de módulo e versão.
- **Device** - cada campo de build, definido por estado e agrupado por categoria.
- **Spoofing** - modo de escopo e as chaves dos motores.
- **System** - os grupos do resetprop.
- **Tools** - Analyze, Check Update, Update Now, Backup / Restore, a auto-atualização no boot
  e o relatório de Diagnostics (um botão para ler e exportar tudo que é útil para um report de
  bug).

Ela não faz nenhuma requisição de rede; tudo de que precisa vem dentro do módulo.

## Solução de problemas

- **Um app ainda vê o dispositivo real.** Verifique o escopo: em `playstore` só a stack do Play
  é coberta. Confirme que a configuração faz parse (rode o Analyze). Depois de mudar motores,
  `drm_targets` ou o perfil, **reinicie** - o Zygisk lê o escopo quando o zygote inicia.
- **O Play Integrity ainda falha.** Garanta que o fingerprint esteja atualizado (Check Update) e
  que o `SECURITY_PATCH` esteja em `global_fields` para que ele fique coerente em todo o dispositivo. Mate os
  Google Play services para que ele refaça a atestação.
- **O telefone entra em softloop depois de ativar o spoofing de versão.** Essa é a armadilha da versão do Android
  acima - volte o `spoof_version` para `never`.
- **A WebUI não abre no Magisk.** Use o [KsuWebUIStandalone](https://github.com/KOWX712/KsuWebUIStandalone/releases).

*Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [../CONTRIBUTING.md](CONTRIBUTING.md).*

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._
