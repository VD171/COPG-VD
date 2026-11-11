> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · Español · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuir a COPG-VD

¡Gracias por ayudar! COPG-VD está pensado para que sea fácil contribuir. Esta guía te dice
dónde vive cada cosa y las pocas convenciones que seguimos.

## El proyecto de un vistazo

COPG-VD es un **spoofer de dispositivo con Zygisk**: una pequeña biblioteca nativa que se
inyecta en los procesos de las apps para reescribir la huella del dispositivo y el build, más
una WebUI en vanilla JS para controlarlo. Es un fork de COPG (de AlirezaParsi), mantenido por
VD171 bajo la licencia Apache-2.0. Consulta [ARCHITECTURE.md](ARCHITECTURE.md) y
[FILE-STRUCTURE.md](FILE-STRUCTURE.md).

De forma predeterminada acota el spoof al stack de Google Play mediante Zygisk, así que es
una alternativa más ligera y robusta a PlayIntegrityFix.

## Colaboradores de IA bienvenidos

Los asistentes y agentes de IA son colaboradores de primera clase aquí, no una ocurrencia
tardía.

- El proyecto está construido para ser legible: la configuración es un único archivo JSON
  (`/data/adb/COPG-VD/COPG-VD.json`, documentado en [CONFIGURATION.md](CONFIGURATION.md)), los
  motores son pequeños y autocontenidos, y la disposición está en
  [FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Los parches asistidos por IA se revisan y aceptan en los mismos términos que cualquier
  otro - por corrección, claridad y las convenciones de abajo, no por quién (o qué) los
  escribió.
- El mismo listón para todos: una función real nunca se debilita, el spoof se mantiene
  coherente, y nada secreto o específico del dispositivo llega al repo (consulta el
  [.gitignore](../../.gitignore)).

## Configuración de desarrollo

- Necesitas un dispositivo rooteado o un emulador con Zygisk (KernelSU, APatch o Magisk) para
  probar.
- Compila la biblioteca nativa por ABI con el NDK (r29) y CMake - consulta el paso `Build
  zygisk libraries` en [`.github/workflows/COPG-VD.yml`](../../.github/workflows/COPG-VD.yml) para
  el comando exacto. CI compila las tres ABIs por ti.
- Compila un zip flasheable: copia el `libspoof.so` compilado en `module/zygisk/<abi>.so`,
  luego `cd module && zip -r9 ../COPG-VD-dev.zip .` y flashéalo.
- La WebUI es `module/webroot/` (ábrela desde el gestor de root). La lógica de spoofing es
  `zygisk/spoof_module.cpp`; el obtentor del perfil es `module/fingerprint-update.sh`.

## Convenciones

- **Cada archivo fuente del módulo** (`.cpp`, `.sh`, `.js`, `.css`, `.html`) empieza con la
  cabecera de banner del proyecto (cópiala de cualquier archivo existente). Las herramientas
  bajo `.github/` usan en su lugar un comentario corto.
- **Código y comentarios en inglés.** Mantén los comentarios al mínimo y solo donde haga
  falta.
- **Sin em-dash ni en-dash**; usa siempre un guion simple `-`.
- La WebUI es **vanilla JS** (un solo `scripts.js`); sin frameworks.
- **Nunca debilites** una función real: mantén el spoof coherente, y no hagas que los hooks
  hagan caer una app a la que están adjuntos (tienen comprobación de null a propósito).

## Internacionalización (i18n)

- Las cadenas de la UI viven en `module/webroot/lang/`. El inglés es el fallback canónico
  (`en.js` + `en.json`); los otros 20 idiomas son `<code>.json`.
- Para añadir o cambiar una cadena: edita `en.js` **y** `en.json`, luego actualiza cada
  `<code>.json`. Tocar una etiqueta visible significa actualizar **todos** los archivos de
  idioma y **todos** los `README.<code>.md`.
- Las traducciones son JSON simple - una gran primera contribución.

## Commits y PRs

- Mantén los PRs enfocados. Describe el qué y el porqué.
- Firma tus commits (DCO): `git commit -s` (añade `Signed-off-by:`).
- CI debe seguir en verde. Sé amable en las revisiones - consulta [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Buenas primeras incidencias

Busca las etiquetas `good first issue` y `help wanted`. Las traducciones, la documentación y
los nuevos perfiles de Pixel son todos excelentes puntos de partida.

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Las correcciones y mejoras son bienvenidas - consulta [CONTRIBUTING.md](CONTRIBUTING.md).*
