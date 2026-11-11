> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · Português · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuindo com o COPG-VD

Obrigado por ajudar! O COPG-VD foi feito para ser fácil de contribuir. Este guia diz onde as
coisas ficam e as poucas convenções que seguimos.

## O projeto em resumo

O COPG-VD é um **spoofer de dispositivo Zygisk**: uma pequena biblioteca nativa que é injetada nos
processos dos apps para reescrever o fingerprint e o build do dispositivo, mais uma WebUI em JS puro para controlá-lo.
É um fork do COPG (por AlirezaParsi), mantido por VD171 sob a licença Apache-2.0.
Veja [ARCHITECTURE.md](ARCHITECTURE.md) e [FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Por padrão, ele limita o spoof à stack do Google Play por meio do Zygisk, sendo assim uma
alternativa mais leve e robusta ao PlayIntegrityFix.

## Contribuidores de IA bem-vindos

Assistentes e agentes de IA são contribuidores de primeira classe aqui, não uma reflexão tardia.

- O projeto foi feito para ser legível: a configuração é um único arquivo JSON
  (`/data/adb/COPG-VD/COPG-VD.json`, documentado em [CONFIGURATION.md](CONFIGURATION.md)),
  os motores são pequenos e autocontidos, e o layout está em [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Patches assistidos por IA são revisados e aceitos nos mesmos termos de qualquer outro - por
  correção, clareza e as convenções abaixo, não por quem (ou o quê) os escreveu.
- A mesma régua para todos: uma funcionalidade real nunca é enfraquecida, o spoof permanece coerente, e
  nada secreto ou específico de dispositivo entra no repositório (veja o [.gitignore](../../.gitignore)).

## Setup de desenvolvimento

- Você precisa de um dispositivo com root ou emulador com Zygisk (KernelSU, APatch ou Magisk) para testar.
- Compile a biblioteca nativa por ABI com o NDK (r29) e o CMake - veja o passo `Build zygisk
  libraries` em [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) para o
  comando exato. O CI compila todas as três ABIs para você.
- Compile um zip flashável: copie o `libspoof.so` compilado para `module/zygisk/<abi>.so`, depois
  `cd module && zip -r9 ../COPG-VD-dev.zip .` e faça o flash.
- A WebUI é `module/webroot/` (abra pelo gerenciador de root). A lógica de spoofing é
  `zygisk/spoof_module.cpp`; o buscador de perfil é `module/fingerprint-update.sh`.

## Convenções

- **Todo arquivo-fonte do módulo** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) começa com o
  cabeçalho de banner do projeto (copie-o de qualquer arquivo existente). O ferramental em `.github/` usa
  um comentário curto no lugar.
- **Código e comentários em inglês.** Mantenha os comentários mínimos e só onde necessário.
- **Sem em-dash nem en-dash**; sempre use um hífen simples `-`.
- A WebUI é **JS puro** (um único `scripts.js`); sem frameworks.
- **Nunca enfraqueça** uma funcionalidade real: mantenha o spoof coerente e não faça os hooks
  travarem um app ao qual estão anexados (eles têm checagem de null de propósito).

## Internacionalização (i18n)

- As strings de UI ficam em `module/webroot/lang/`. O inglês é o fallback canônico
  (`en.js` + `en.json`); os outros 20 idiomas são `<code>.json`.
- Para adicionar ou alterar uma string: edite `en.js` **e** `en.json`, depois atualize cada
  `<code>.json`. Mexer em um rótulo visível significa atualizar **todos** os arquivos de idioma e
  **todos** os `README.<code>.md`.
- As traduções são JSON puro - uma ótima primeira contribuição.

## Commits e PRs

- Mantenha os PRs focados. Descreva o quê e o porquê.
- Assine seus commits (DCO): `git commit -s` (adiciona `Signed-off-by:`).
- O CI precisa continuar verde. Seja gentil nas revisões - veja [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Boas primeiras issues

Procure as labels `good first issue` e `help wanted`. Traduções, docs e novos
perfis Pixel são ótimos pontos de partida.

*Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [CONTRIBUTING.md](CONTRIBUTING.md).*
