> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · Português · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arquitetura

O COPG-VD é um módulo Zygisk: uma pequena biblioteca nativa (`libspoof.so`) que o loader do Zygisk
injeta no zygote e, a partir dele, nos processos dos apps. Tudo o que ela faz é apresentar uma
identidade de dispositivo escolhida aos processos que você mira. Não há app e, fora o
fetch opcional do perfil, não há rede.

## Ciclo de vida

1. **Início do zygote.** Quando o zygote inicia, o loader chama o `onLoad` do módulo. Ele
   lê `/data/adb/COPG-VD.json` uma vez: a configuração de escopo e o perfil.
2. **Fork do app.** Para cada app que o zygote faz fork, o módulo decide em
   `preAppSpecialize` se esse processo está no escopo:
   - **no escopo principal** (`playstore` / `global` / `whitelist` / `blacklist`), ou
   - **no escopo de DRM** (listado em `drm_targets`).
   Se não estiver em nenhum, o módulo **se desconecta** desse processo (`dlclose`) e não deixa
   rastro nele.
3. **Specialize.** Para um processo que permanece, os motores são aplicados em `postAppSpecialize`,
   enquanto o processo ainda está privilegiado.

Como os forks herdam a cópia de memória copy-on-write do zygote, cada app começa a partir da configuração
lida no boot. O módulo relê o arquivo por processo alvo somente quando ele de fato
mudou, então um app recém-iniciado ou reaberto pega um perfil editado - mas a própria decisão de
escopo é tomada no início do zygote, então **mudar o escopo, os motores ou
`drm_targets` exige uma reinicialização**.

## Os motores

Cada um é independente e alternável.

- **Campos de Build (`motor_jni`).** Reescreve `android.os.Build.*` (e `Build.VERSION.*`)
  no processo alvo via JNI, para que o código Java leia os valores falsificados.
- **Hook de propriedades (`motor_prop_hook`).** Apresenta as propriedades de sistema falsificadas ao
  processo por meio de um remapeamento clean-room, por processo, da área de propriedades (`prop_virtualizer`).
  É um remapeamento de memória, não um hook de função, então não há pegada de função com hook.
- **resetprop (em todo o dispositivo).** Escreve as propriedades de sistema por grupo - identidade, versão,
  estado de boot, SELinux, adb/usb, anti-emulador, mais uma passada de limpeza. Os scripts de boot o
  rodam. Em um modo com escopo, os grupos de identidade e versão ficam de fora (o Zygisk os entrega
  por processo); os grupos boot, lock e SELinux permanecem globais para que o dispositivo seja coerente.
- **DRM / Widevine (`motor_drm`).** Faz hook nos métodos do `MediaDrm` que reportam o nível de segurança
  Widevine (`getSecurityLevel`, `getPropertyString`) e retorna o nível
  configurado. Os hooks têm checagem de null, então um perfil malformado degrada graciosamente em vez de
  travar o app. O `drm_targets` permite que esse motor rode na sua própria lista de apps, desacoplada do
  escopo principal.

## Lendo a configuração

O processo injetado roda no domínio SELinux do zygote, que por padrão não consegue alcançar
`/data/adb`. O módulo traz sua própria `sepolicy.rule` para permitir isso, e, como fallback,
pode ler a configuração por meio do seu diretório de módulo aberto (`getModuleDir`), de modo que continua
funcionando mesmo se um build do Zygisk parar de conceder o caminho. O arquivo é feito parse com um pequeno
parser JSON embutido (`jsmn`); um arquivo que não faz parse significa que o módulo não falsifica nada.

## Mantendo o perfil atualizado

O `fingerprint-update.sh` atualiza os campos de build a partir da imagem de fábrica Google mais recente,
pela WebUI ou uma vez por boot. Ele usa o próprio downloader embarcado do módulo (não um `curl`/`wget`
do `PATH`), valida cada valor antes de usar, nunca retrocede e recusa um
perfil que falsifica um dispositivo diferente. `android.os.Build` é escrito no início do zygote, então
os novos valores chegam aos apps na próxima reinicialização. Veja [USER-GUIDE.md](USER-GUIDE.md) para o lado do
usuário e [CONFIGURATION.md](CONFIGURATION.md) para os campos.

## Por que a versão do Android não é falsificada por padrão

Elevar `SDK_INT` / `ANDROID_VERSION` acima do que o framework da ROM realmente é faz com que os apps
chamem APIs que não existem, o que trava os apps do Google e reinicia o telefone em um
softloop. O grupo de versão é, portanto, desligado por padrão e protegido por trás do
`spoof_version`. O módulo lê a versão real de `/system/build.prop`, nunca do
`getprop`, porque o `getprop` é exatamente o que ele falsifica. Veja a armadilha em
[USER-GUIDE.md](USER-GUIDE.md#the-android-version-trap).

*Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [../CONTRIBUTING.md](CONTRIBUTING.md).*
