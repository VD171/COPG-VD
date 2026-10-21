## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

COPG-VD é um spoofer de dispositivo: ele reescreve o fingerprint e o build do dispositivo para que os apps vejam o dispositivo que você escolher em vez do real.  
Ele roda no Zygisk (KernelSU, APatch ou Magisk) e, por padrão, restringe o spoof à stack do Google Play - então é uma alternativa mais leve e mais robusta ao PlayIntegrityFix.  

## Capturas de tela

<p align="center">
  <img src="screenshots/device.png" width="24%" alt="Device"> <img src="screenshots/spoofing.png" width="24%" alt="Spoofing"> <img src="screenshots/system.png" width="24%" alt="System"> <img src="screenshots/tools.png" width="24%" alt="Tools">
</p>

## Como usar?
Instale o módulo, reinicie, e o perfil incluído (um Pixel) é spoofado para os apps alvo. Com um fingerprint funcional você não precisa do PlayIntegrityFix nem do GooglePhotosUnlimited.  
Tudo é configurado em `/data/adb/COPG-VD.json`, ou pela WebUI. Todos os campos são OPCIONAIS - um campo que não for informado é ignorado.  

### Escopo - quem vê o spoof
`scope_mode` decide quais processos recebem a identidade spoofada. Em um modo com escopo, a identidade é entregue por processo pelo Zygisk e não vaza para o resto do sistema pelas propriedades globais.  
* **Google Play** (`playstore`, o padrão) - apenas a stack do Play (Google Play services, seu processo unstable e a Play Store).  
* **Global** - o dispositivo inteiro; todo processo a vê.  
* **Whitelist** - apenas os apps em `scope_whitelist`.  
* **Blacklist** - todos os apps exceto os que estão em `scope_blacklist`.  

### Engines - como o spoof é entregue
Cada uma é independente e pode ser desligada:  
* **Build fields (JNI)** - reescreve `android.os.Build.*` nos processos alvo.  
* **Property hook** - apresenta as propriedades de sistema spoofadas aos processos alvo (um remapeamento clean-room da área de propriedades por processo, sem hook de função).  
* **resetprop** - reescreve as propriedades de sistema, gerenciadas por grupo: identidade, versão, estado de boot, SELinux, adb/usb, anti-emulador e uma passada de limpeza. Em um modo com escopo, os grupos de identidade e versão ficam de fora do resetprop para o dispositivo inteiro (o Zygisk os entrega por processo); os grupos de boot/lock/SELinux permanecem globais.  
* **DRM / Widevine** (desligado por padrão) - reporta um nível de segurança Widevine escolhido, L1 ou L3, aos apps que o leem.  

### Campos - definir, vazio, remover ou ignorar
Dentro do objeto `COPG-VD`, cada campo Build tem quatro estados:  
* **Definir** - `"KEY": "value"` escreve o valor.  
* **Vazio** - `"KEY": ""` escreve um valor vazio.  
* **Remover** - liste a chave em um `"COPG-VD-Delete": [ ... ]` de nível superior para removê-la (um campo Build vira null, uma propriedade é removida com `resetprop --delete`).  
* **Ignorar** - deixe a chave totalmente de fora; o valor da própria ROM é mantido.  

Uma lista `"global_fields": [ ... ]` aplica os campos Build nomeados no dispositivo inteiro mesmo em um modo com escopo, para manter um valor consistente em todo lugar - apenas para campos seguros quanto à coerência (o security patch, por exemplo), nunca identidade e nunca o grupo da versão do Android.  

### Exemplo de arquivo de configuração JSON
`/data/adb/COPG-VD.json`
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/tegu_beta-zp11.260918.007-factory-f5955275.zip",
  "scope_mode": "playstore",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "tegu",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9a",
    "FINGERPRINT": "google/tegu_beta/tegu:CANARY/ZP11.260918.007/16484274:user/release-keys",
    "PRODUCT": "tegu_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "tegu",
    "HARDWARE": "tegu",
    "DISPLAY": "ZP11.260918.007",
    "ID": "ZP11.260918.007",
    "HOST": "51b22e6d8afb",
    "INCREMENTAL": "16484274",
    "TIMESTAMP": "1790806751",
    "PREVIEW_SDK": "20261007",
    "USER": "android-build",
    "SDK_FINGERPRINT": "d9ad4b00fa641d6e43c42cc969f49492",
    "UUID": "_mQOcxvuFzRVZAjNEr2UUUpk2fv0mqDc8RpFyaeJjuk",
    "SECURITY_PATCH": "2026-10-05",
    "FIRST_API_LEVEL": "35",
    "DRM_SECURITY_LEVEL": "L1"
  },
  "motor_drm": false,
  "global_fields": ["SECURITY_PATCH"]
}
```
Certifique-se de usar strings apenas com aspas duplas.  
O bloco acima e `module/COPG-VD.json.example` são atualizados diariamente pelo workflow [Update COPG-VD.json](.github/workflows/update-json.yml), direto da imagem de fábrica mais recente do Google.  

### Mantendo o fingerprint atualizado
`fingerprint-update.sh` baixa esse arquivo e atualiza sua configuração, pela WebUI (**Check Update** / **Update Now**) ou por conta própria **uma vez por boot** (**Auto-update JSON on boot**, ativado por padrão).  
* Tanto `/data/adb/COPG-VD.json` quanto `/data/adb/modules/COPG-VD/COPG-VD.json` são atualizados quando ambos existem, e o conteúdo anterior é mantido como `.bak`.  
* Apenas os campos de build são reescritos (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Todo o resto que você personalizou é preservado: chaves extras, `scope_mode`, `BOOTLOADER`/`BOARD`/`HARDWARE`, outros objetos, ordem das chaves e formatação.  
* Ele nunca retrocede: um build upstream mais antigo do que o instalado é recusado. Isso é rotineiro (o repositório pode ficar atrás de uma configuração que você atualizou à mão) e também é a proteção que mais importa no Android, onde o único downloader disponível é o busybox `wget`, que não consegue validar certificados TLS - todo valor é validado antes do uso pelo mesmo motivo.  
* Se o seu perfil faz spoof de **outro dispositivo** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` diferentes), nada é aplicado - um fingerprint de Pixel em outro perfil é pior do que um fingerprint antigo.  
* No boot ele roda em segundo plano e segue tentando por ~10 minutos, porque o wifi geralmente ainda não subiu quando o boot termina. Ele nunca atrasa o boot.  
* `resetprop` é reaplicado logo após uma atualização, mas `android.os.Build` é escrito pelo módulo zygisk quando o zygote inicia: **reinicie** para os novos valores chegarem aos apps.  
* Log em `/data/adb/COPG-VD.update.log`.  

### Versão do Android - e por que ela não é falsificada
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME` descrevem **a sua ROM**, não o dispositivo que está sendo spoofado. Dizer aos apps que o SDK é mais novo do que o framework realmente é faz com que eles chamem APIs que não existem: os apps do Google travam, o celular reinicia, e tudo recomeça. O boot em si se completa, então é um **softloop** e nada aparece nos logs de boot.  
* Eles não estão na configuração entregue e o atualizador nunca os escreve.  
* **Spoof Android version** na WebUI decide se eles são aplicados ou não:  
  * **Never** (padrão) - a própria versão da ROM é usada.  
  * **Up to this ROM** - apenas o que não a ultrapassa, o que na prática significa baixar o SDK.  
  * **Force** - exatamente o que a configuração diz. É isso que causa o softloop.  
* A versão real é lida de `/system/build.prop`, nunca do `getprop` - que é justamente o que este módulo falsifica.  

### Analyze
**Analyze** na WebUI (ou `fingerprint-update.sh analyze`) audita a configuração como ela está: a versão em relação à ROM, se o arquivo ainda é interpretável (um arquivo quebrado faz o módulo não spoofar **nada**, e só o logcat avisa), se o fingerprint concorda com os campos ao redor, chaves que o módulo não lê, datas, e se as props já carregam o que a configuração pede.  

### WebUI
A WebUI é opcional - tudo pode ser editado diretamente na configuração JSON - mas é o jeito fácil de operar o módulo. Ela tem cinco abas: **About**, **Device** (todos os campos, definidos por estado, agrupados por categoria), **Spoofing** (escopo e engines), **System** (os grupos do resetprop) e **Tools** (Analyze, Check Update, Update Now, Backup/Restore e o auto-update de boot). Ela não faz nenhuma requisição de rede; tudo o que precisa vem dentro do módulo.  
Se você é usuário de Magisk, use o KsuWebUI do KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  

### Configurações na config
`COPG-VD.json` carrega suas configurações junto ao perfil, então suas escolhas viajam com um backup e podem ser editadas à mão: `scope_mode`, as chaves das engines, os grupos do resetprop, `global_fields`, e um objeto `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version`). A WebUI escreve tanto a configuração quanto os arquivos de flag que os scripts de boot leem. `"spoof_version": "force"` é recusado a partir do arquivo e rebaixado: restaurar um backup antigo não deve rearmá-lo sem você saber.  

## Contatos

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

---

**Tags:** `Zygisk` `KernelSU` `APatch` `Magisk` `device-spoofing` `fingerprint` `PlayIntegrity` `Pixel` `build.prop` `resetprop` `root` `Android` `COPG` `COPG-VD`
