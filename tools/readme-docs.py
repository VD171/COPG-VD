#!/usr/bin/env python3
# ======================================================================
#  COPG-VD  ::  global device spoofer
#  Spoof your device fingerprint and build: Zygisk, KernelSU/APatch/Magisk.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#  Fork by VD171.
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/COPG-VD
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
"""Insert or refresh a "Documentation" section in every README (links to docs/ in
the README's own language plus the wiki), before the <!-- vd-see-also --> marker.
Deterministic and idempotent. Run after adding a doc or a language.

    tools/readme-docs.py [repo_root]
"""
import os, re, sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "id", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "uk", "vi", "zh"]
HEAD = {"en": "Documentation", "ar": "التوثيق", "cs": "Dokumentace", "de": "Dokumentation",
        "es": "Documentación", "fa": "مستندات", "fr": "Documentation", "hi": "दस्तावेज़ीकरण",
        "id": "Dokumentasi", "it": "Documentazione", "ja": "ドキュメント", "ko": "문서",
        "nl": "Documentatie", "pl": "Dokumentacja", "pt": "Documentação", "ru": "Документация",
        "sv": "Dokumentation", "th": "เอกสารประกอบ", "tr": "Belgeler", "uk": "Документація", "vi": "Tài liệu", "zh": "文档"}
DOCS = ["USER-GUIDE", "CONFIGURATION", "ARCHITECTURE", "FILE-STRUCTURE"]
WIKI = "https://github.com/VD171/COPG-VD/wiki"
MARK = "<!-- vd-docs -->"
ENDMARK = "<!-- /vd-docs -->"
SEEALSO = "<!-- vd-see-also -->"

# Short description per doc, per language, for the rich "Documentation" section.
# Keys: wiki, user, config, archfs (Architecture + File structure share a line), and (conjunction).
DESC = {
    "en": {"wiki": "the full documentation, browsable online.",
           "user": "install it, the WebUI, and day-to-day use.",
           "config": "every setting in the config file and what it does.",
           "archfs": "how the spoofing works and where everything lives.",
           "and": "and"},
    "ar": {"wiki": "الوثائق الكاملة، يمكن تصفحها عبر الإنترنت.",
           "user": "التثبيت وواجهة WebUI والاستخدام اليومي.",
           "config": "كل إعداد في ملف الإعدادات وما يفعله.",
           "archfs": "كيف يعمل التزييف وأين يوجد كل شيء.",
           "and": "و"},
    "cs": {"wiki": "kompletní dokumentace, k prohlížení online.",
           "user": "instalace, WebUI a každodenní používání.",
           "config": "každé nastavení v konfiguračním souboru a co dělá.",
           "archfs": "jak spoofing funguje a kde všechno najdete.",
           "and": "a"},
    "de": {"wiki": "die vollständige Dokumentation, online durchsuchbar.",
           "user": "Installation, die WebUI und die tägliche Nutzung.",
           "config": "jede Einstellung in der Konfigurationsdatei und ihre Funktion.",
           "archfs": "wie das Spoofing funktioniert und wo alles liegt.",
           "and": "und"},
    "es": {"wiki": "la documentación completa, para consultar en línea.",
           "user": "cómo instalarlo, la WebUI y el uso diario.",
           "config": "cada ajuste del archivo de configuración y qué hace.",
           "archfs": "cómo funciona el spoofing y dónde está cada cosa.",
           "and": "y"},
    "fa": {"wiki": "مستندات کامل، قابل مرور به صورت آنلاین.",
           "user": "نصب، WebUI و استفاده روزمره.",
           "config": "هر تنظیم در فایل پیکربندی و کاری که انجام می‌دهد.",
           "archfs": "نحوه کار جعل و محل قرارگیری همه چیز.",
           "and": "و"},
    "fr": {"wiki": "la documentation complète, consultable en ligne.",
           "user": "l'installation, la WebUI et l'usage au quotidien.",
           "config": "chaque paramètre du fichier de configuration et son rôle.",
           "archfs": "comment fonctionne le spoofing et où tout se trouve.",
           "and": "et"},
    "hi": {"wiki": "पूरा दस्तावेज़ीकरण, ऑनलाइन देखने योग्य।",
           "user": "इंस्टॉल करना, WebUI, और रोज़मर्रा का उपयोग।",
           "config": "कॉन्फ़िग फ़ाइल की हर सेटिंग और वह क्या करती है।",
           "archfs": "स्पूफिंग कैसे काम करती है और सब कुछ कहाँ है।",
           "and": "और"},
    "id": {"wiki": "dokumentasi lengkap, dapat dibaca online.",
           "user": "cara memasang, WebUI, dan penggunaan sehari-hari.",
           "config": "setiap pengaturan di berkas konfigurasi dan fungsinya.",
           "archfs": "cara kerja spoofing dan lokasi semua berkas.",
           "and": "dan"},
    "it": {"wiki": "la documentazione completa, consultabile online.",
           "user": "l'installazione, la WebUI e l'uso quotidiano.",
           "config": "ogni impostazione del file di configurazione e cosa fa.",
           "archfs": "come funziona lo spoofing e dove si trova tutto.",
           "and": "e"},
    "ja": {"wiki": "オンラインで閲覧できる完全なドキュメント。",
           "user": "インストール、WebUI、日々の使い方。",
           "config": "設定ファイルの各項目とその役割。",
           "archfs": "スプーフィングの仕組みと各ファイルの場所。",
           "and": "と"},
    "ko": {"wiki": "온라인으로 볼 수 있는 전체 문서.",
           "user": "설치, WebUI, 그리고 일상적인 사용법.",
           "config": "설정 파일의 모든 항목과 그 역할.",
           "archfs": "스푸핑 작동 방식과 모든 파일의 위치.",
           "and": "및"},
    "nl": {"wiki": "de volledige documentatie, online te doorzoeken.",
           "user": "de installatie, de WebUI en het dagelijks gebruik.",
           "config": "elke instelling in het configuratiebestand en wat ze doet.",
           "archfs": "hoe het spoofing werkt en waar alles staat.",
           "and": "en"},
    "pl": {"wiki": "pełna dokumentacja, dostępna online.",
           "user": "instalacja, WebUI i codzienne użytkowanie.",
           "config": "każde ustawienie w pliku konfiguracyjnym i jego działanie.",
           "archfs": "jak działa spoofing i gdzie wszystko się znajduje.",
           "and": "i"},
    "pt": {"wiki": "a documentação completa, para consultar online.",
           "user": "como instalar, a WebUI e o uso no dia a dia.",
           "config": "cada opção do arquivo de configuração e o que faz.",
           "archfs": "como o spoofing funciona e onde tudo fica.",
           "and": "e"},
    "ru": {"wiki": "полная документация, доступная онлайн.",
           "user": "установка, WebUI и повседневное использование.",
           "config": "каждая настройка в файле конфигурации и что она делает.",
           "archfs": "как работает спуфинг и где всё находится.",
           "and": "и"},
    "sv": {"wiki": "den fullständiga dokumentationen, läsbar online.",
           "user": "installation, WebUI och den dagliga användningen.",
           "config": "varje inställning i konfigurationsfilen och vad den gör.",
           "archfs": "hur spoofingen fungerar och var allt finns.",
           "and": "och"},
    "th": {"wiki": "เอกสารฉบับเต็ม อ่านได้ทางออนไลน์",
           "user": "การติดตั้ง WebUI และการใช้งานประจำวัน",
           "config": "ทุกการตั้งค่าในไฟล์คอนฟิกและหน้าที่ของมัน",
           "archfs": "สปูฟทำงานอย่างไรและทุกอย่างอยู่ที่ไหน",
           "and": "และ"},
    "tr": {"wiki": "çevrimiçi göz atılabilen tam belgeler.",
           "user": "kurulumu, WebUI ve günlük kullanımı.",
           "config": "yapılandırma dosyasındaki her ayar ve ne işe yaradığı.",
           "archfs": "spoofing'in nasıl çalıştığı ve her şeyin nerede olduğu.",
           "and": "ve"},
    "uk": {"wiki": "повна документація, доступна онлайн.",
           "user": "встановлення, WebUI та щоденне використання.",
           "config": "кожне налаштування у файлі конфігурації та що воно робить.",
           "archfs": "як працює спуфінг і де все розташоване.",
           "and": "та"},
    "vi": {"wiki": "tài liệu đầy đủ, có thể xem trực tuyến.",
           "user": "cách cài đặt, WebUI và sử dụng hàng ngày.",
           "config": "mọi thiết lập trong tệp cấu hình và chức năng của nó.",
           "archfs": "cách spoofing hoạt động và mọi thứ nằm ở đâu.",
           "and": "và"},
    "zh": {"wiki": "完整文档，可在线浏览。",
           "user": "安装、WebUI 以及日常使用。",
           "config": "配置文件中的每一项设置及其作用。",
           "archfs": "欺骗如何工作以及各文件的位置。",
           "and": "和"},
}

def h1(path):
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.startswith("# "):
                return line[2:].strip()
    return None

def doc_path(lang, base):
    return f"docs/{base}.md" if lang == "en" else f"docs/{lang}/{base}.md"

def wiki_url(lang, base):
    return f"{WIKI}/{base}" if lang == "en" else f"{WIKI}/{lang}-{base}"

def section(lang):
    d = DESC.get(lang, DESC["en"])
    lbl = {b: (h1(os.path.join(ROOT, doc_path(lang, b))) or b) for b in DOCS}
    home = WIKI if lang == "en" else f"{WIKI}/{lang}-Home"
    lines = [
        f"- **[Wiki]({home})**: {d['wiki']}",
        f"- **[{lbl['USER-GUIDE']}]({wiki_url(lang, 'USER-GUIDE')})**: {d['user']}",
        f"- **[{lbl['CONFIGURATION']}]({wiki_url(lang, 'CONFIGURATION')})**: {d['config']}",
        f"- **[{lbl['ARCHITECTURE']}]({wiki_url(lang, 'ARCHITECTURE')})** {d['and']} "
        f"**[{lbl['FILE-STRUCTURE']}]({wiki_url(lang, 'FILE-STRUCTURE')})**: {d['archfs']}",
    ]
    return f"{MARK}\n## {HEAD[lang]}\n\n" + "\n".join(lines) + f"\n\n{ENDMARK}\n\n"

def apply(lang):
    rp = os.path.join(ROOT, "README.md" if lang == "en" else f"README.{lang}.md")
    if not os.path.exists(rp):
        return False
    t = open(rp, encoding="utf-8").read()
    t = re.sub(re.escape(MARK) + r".*?" + re.escape(ENDMARK) + r"\n*", "", t, flags=re.S)
    t = re.sub(re.escape(MARK) + r".*?(?=" + re.escape(SEEALSO) + r")", "", t, flags=re.S)
    heads = [m.start() for m in re.finditer(r"(?m)^## ", t)]
    if len(heads) < 2:
        return False
    pos = heads[1]
    t = t[:pos] + section(lang) + t[pos:]
    open(rp, "w", encoding="utf-8").write(t)
    return True

n = sum(apply(l) for l in LANGS)
print(f"README documentation section set on {n} files")
