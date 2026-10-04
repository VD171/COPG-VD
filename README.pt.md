## COPG-VD

[English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)
COPG-VD é um módulo projetado para spoofing global do dispositivo.  
Isso significa que até os apps do sistema e o dispositivo inteiro serão hookados.  
  
## Como usar?
Ao usar este módulo e fazer spoofing de um FingerPrint funcional, usar PlayIntegrityFix ou GooglePhotosUnlimited é desnecessário.  
### Exemplo de arquivo de configuração JSON  
`/data/adb/COPG-VD.json`
* Todos os campos são OPCIONAIS. Se algum campo não for informado, ele será ignorado.  
```json
{
  "Instructions": "Use strings on double-quotes only.",
  "Instructions": "All fields are OPTIONAL. If some field is not provided, it will be skipped.",
  "Strings extracted from": "https://dl.google.com/developers/android/CANARY/images/factory/comet_beta-zp11.260821.010-factory-08a98446.zip",
  "COPG-VD": {
    "BRAND": "google",
    "DEVICE": "comet",
    "MANUFACTURER": "Google",
    "MODEL": "Pixel 9 Pro Fold",
    "FINGERPRINT": "google/comet_beta/comet:CANARY/ZP11.260821.010/16290768:user/release-keys",
    "PRODUCT": "comet_beta",
    "BOOTLOADER": "unknown",
    "BOARD": "comet",
    "HARDWARE": "comet",
    "DISPLAY": "ZP11.260821.010",
    "ID": "ZP11.260821.010",
    "HOST": "901e56a65b6b",
    "INCREMENTAL": "16290768",
    "TIMESTAMP": "1788897757",
    "PREVIEW_SDK": "20260909",
    "USER": "android-build",
    "SDK_FINGERPRINT": "dcead6233b738ebc908d5d77cd445f8b",
    "UUID": "f7zpdMvb23VEDwaAnZZSj_0jpgXfIAILKODaGMBrmOA",
    "SECURITY_PATCH": "2026-09-05"
  }
}
```
Certifique-se de usar strings apenas com aspas duplas.  
O bloco acima e `module/COPG-VD.json.example` são atualizados diariamente pelo workflow [Update COPG-VD.json](.github/workflows/update-json.yml), direto da imagem de fábrica mais recente do Google.  
### Mantendo o fingerprint atualizado  
`fingerprint-update.sh` baixa esse arquivo e atualiza sua configuração, pela WebUI (**Check Update** / **Update Now**) ou por conta própria **uma vez por boot** (**Auto-update JSON on boot**, ativado por padrão).  
* Tanto `/data/adb/COPG-VD.json` quanto `/data/adb/modules/COPG-VD/COPG-VD.json` são atualizados quando ambos existem, e o conteúdo anterior é mantido como `.bak`.  
* Apenas os campos de build são reescritos (fingerprint, ID, incremental, timestamp, security patch, SDK, UUID, host, user). Todo o resto que você personalizou é preservado: chaves extras, `BOOTLOADER`/`BOARD`/`HARDWARE`, outros objetos, ordem das chaves e formatação.  
* Ele nunca retrocede: um build upstream mais antigo do que o instalado é recusado. Isso é
  rotineiro (o repositório pode ficar atrás de uma configuração que você atualizou à mão) e também é a proteção que
  mais importa no Android, onde o único downloader disponível é o busybox `wget`, que não consegue
  validar certificados TLS - todo valor é validado antes do uso pelo mesmo motivo.  
* Se o seu perfil faz spoofing de **outro dispositivo** (`BRAND`/`DEVICE`/`MANUFACTURER`/`MODEL`/`PRODUCT` diferentes), nada é aplicado - um fingerprint de Pixel em outro perfil é pior do que um fingerprint antigo.  
* No boot ele roda em segundo plano e segue tentando por ~10 minutos, porque o wifi geralmente ainda não subiu quando o boot termina. Ele nunca atrasa o boot.  
* `resetprop` é reaplicado logo após uma atualização, mas `android.os.Build` é escrito pelo módulo zygisk quando o zygote inicia: **reinicie** para os novos valores chegarem aos apps.  
* Log em `/data/adb/COPG-VD.update.log`.  
### Versão do Android - e por que ela não é falsificada  
`ANDROID_VERSION`, `SDK_INT`, `SDK_FULL` e `CODENAME` descrevem **a sua ROM**, não o dispositivo que está sendo falsificado. Dizer aos apps que o SDK é mais novo do que o framework realmente é faz com que eles chamem APIs que não existem: os apps do Google travam, o celular reinicia, e tudo recomeça. O boot em si se completa, então é um **softloop** e nada aparece nos logs de boot.  
* Eles não estão na configuração entregue e o atualizador nunca os escreve.  
* **Spoof Android version** na WebUI decide se eles são aplicados ou não:  
  * **Never** (padrão) - a própria versão da ROM é usada.  
  * **Up to this ROM** - apenas o que não a ultrapassa, o que na prática significa baixar o SDK.  
  * **Force** - exatamente o que a configuração diz. É isso que causa o softloop.  
* A versão real é lida de `/system/build.prop`, nunca do `getprop` - que é justamente o que este módulo falsifica.  
### Analyze  
**Analyze** na WebUI (ou `fingerprint-update.sh analyze`) audita a configuração como ela está: a versão em relação à ROM, se o arquivo ainda é interpretável (um arquivo quebrado faz o módulo não falsificar **nada**, e só o logcat avisa), se o fingerprint concorda com os campos ao redor, chaves que o módulo não lê, datas, e se as props já carregam o que a configuração pede.  
### Configurações na config  
`COPG-VD.json` pode carregar um objeto `COPG-VD-Settings` - `resetprop`, `autoupdate`, `spoof_manufacturer`, `spoof_version` - para que suas escolhas viajem com um backup e possam ser editadas à mão. A WebUI escreve tanto isso quanto os arquivos de flag que os scripts de boot leem. `"spoof_version": "force"` é recusado a partir do arquivo e rebaixado: restaurar um backup antigo não deve rearmá-lo sem você saber.  
### WebUI  
Usar a WebUI é desnecessário se você edita o arquivo de configuração JSON diretamente.  
Se você é usuário de Magisk, use o KsuWebUI do KOW (https://github.com/KOWX712/KsuWebUIStandalone/releases).  
#### Use resetprop:  
Desative o uso do resetprop e ative apenas o spoof das Build info.  
#### Use ro.product.manufacturer:  
Desative se você se importa com a detecção "Found device spoofing" no app detector de root Disclosure.  

## Contatos

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171
