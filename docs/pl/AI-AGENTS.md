> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../id/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · Polski · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Agenci AI: powierzchnia sterowania

COPG-VD wita współtwórców AI i agentów, a cały moduł zbudowano tak, by dało się nim sterować bezgłowo, bez
scrapowania WebUI. Są dwie powierzchnie, a agent działający jako root (jak robi to WebUI) używa obu:

1. **Plik konfiguracyjny** `/data/adb/COPG-VD/COPG-VD.json` - jedyne źródło prawdy. Każde pole profilu i
   każde ustawienie żyje tutaj, czytanie i zapisywanie tego pliku to sposób, w jaki zmieniasz to, co moduł
   fałszuje.
2. **Punkt wejścia powłoki** `fingerprint-update.sh` - jeden skrypt ze stabilnymi czasownikami do
   sprawdzania, stosowania i pobierania profili.

## Plik konfiguracyjny

`/data/adb/COPG-VD/COPG-VD.json` to zwykły obiekt JSON. Moduł czyta go z wstrzykniętych procesów dzięki
dedykowanej regule SELinux, którą sam dostarcza, nie przechowuje żadnych poświadczeń. Dołączony przykład
znajduje się w `module/COPG-VD.json.example`, odświeżany codziennie z najnowszego obrazu fabrycznego Google.

Zasady, których agent musi przestrzegać:

- **Łańcuchy używają wyłącznie podwójnych cudzysłowów**, jak w JSON.
- **Każde pole jest opcjonalne.** Pole, które nie zostanie podane, jest pomijane i zachowana zostaje własna
  wartość ROM-u.
- Klucze najwyższego poziomu sterujące modułem to `scope_mode`, `scope_whitelist`, `scope_blacklist`,
  `motor_drm`, `drm_targets`, `global_fields`, `process_overrides`, obiekt `COPG-VD` (pola Build), lista
  `COPG-VD-Delete` oraz obiekt `COPG-VD-Settings` (`resetprop`, `autoupdate`, `spoof_version`).
  [Dokumentacja konfiguracji](CONFIGURATION.md) opisuje każdy z nich.
- `"spoof_version": "force"` jest odrzucane, gdy pochodzi z pliku na dysku, i obniżane przy odczycie, więc
  przywrócenie starej kopii zapasowej nie może go po cichu ponownie uzbroić. Politykę wersji ustawiaj przez
  ustawienia, a nie przez ręczne wpisanie `force`.
- Po edycji pliku uruchom **`analyze`** (poniżej): plik, który się nie parsuje, sprawia, że moduł nie fałszuje
  **niczego**, a mówi o tym tylko logcat.

Zmieniona konfiguracja dociera do aplikacji przy następnym starcie procesu. Właściwości dostarczane przez
`resetprop` można zastosować ponownie bez reboota (`service.sh --props-only`), ale pola `android.os.Build.*`
są zapisywane przez bibliotekę Zygisk, gdy startuje zygote, więc do ich dotarcia do aplikacji **wymagany jest
reboot**.

## Kontrakt powłoki

```
sh /data/adb/modules/COPG-VD/fingerprint-update.sh <verb> [arg]
```

Skrypt wypisuje wiersze czytelne dla człowieka, te czytelne dla maszyny zaczynają się od `status:`. Jego kod
wyjścia to `0` przy sukcesie i różny od zera przy niepowodzeniu.

| Czasownik | Co robi | Typowe wyjście |
|---|---|---|
| `check` | Porównuje zainstalowany profil z najnowszym buildem upstream, nic nie zapisuje. | `status: update-available` \| `status: up-to-date` \| `status: local-newer` \| `status: no-config` |
| `apply` | Pobiera najnowszy profil i scala go z konfiguracją (tylko pola Build, twoje pozostałe klucze są zachowane). | `status: applied` \| `status: up-to-date` \| `status: local-newer` \| `status: analyze-red` \| `status: skipped-custom-device` \| `status: failed` |
| `analyze` | Audytuje konfigurację w obecnym stanie (parse, wersja vs ROM, spójność fingerprint, nieznane klucze, daty, props). Wypisuje raport, kod wyjścia odzwierciedla ustalenia red/warn. | raport tekstowy |
| `fetch-index` | Pobiera i weryfikuje podpisany indeks urządzeń oraz go wypisuje (`index.json`). | JSON indeksu \| `status: sig-failed` \| `status: download-failed` |
| `fetch <path>` | Pobiera `build.prop` jednego urządzenia (ścieżka z indeksu, np. `pixel-9a/latest.prop`) i zapisuje jego pola Build do konfiguracji. | `status: fetched` \| `status: bad-path` \| `status: map-failed` \| `status: write-failed` |
| `sync-settings` | Migruje stan/konfigurację ze starego płaskiego układu do `/data/adb/COPG-VD/`. | - |
| `migrate` | Jednorazowa migracja konfiguracji między wersjami modułu. | `status: migrated` \| `status: nothing-to-migrate` |
| `boot` | Automatyczna aktualizacja raz na boot, przeznaczona dla `service.sh`, nie do użytku interaktywnego. | zapisuje `update.status` |

Każde pobranie jest walidowane przed użyciem (jedynym pobieraczem na urządzeniu jest busybox `wget`, który nie
potrafi walidować TLS), a aktualizator profilu nigdy nie cofa się: build upstream starszy niż zainstalowany
jest odrzucany. Indeks kanału i każdy `.prop` niosą odłączony podpis ed25519, który jest weryfikowany, zanim
treść zostanie odczytana.

## Typowe przepływy agenta

- **Utrzymywanie świeżego profilu:** `check`; jeśli `status: update-available`, `apply`; potem zrestartuj,
  aby nowe `Build.*` dotarło do aplikacji.
- **Przełączenie na inny profil Pixela:** `fetch-index`, wybierz ścieżkę urządzenia z indeksu, `fetch
  <path>`, uruchom `analyze`, aby potwierdzić spójność konfiguracji, a następnie zrestartuj.
- **Zmiana zakresu lub silnika:** edytuj `scope_mode` (lub przełącznik silnika) w pliku konfiguracyjnym,
  uruchom `analyze`, a potem `service.sh --props-only` dla zmian dostarczanych przez właściwości, albo
  zrestartuj dla pól Build.

## Bariery bezpieczeństwa

- Zmiana konfiguracji lub zastosowanie profilu zmienia to, co widzi każda docelowa aplikacja, potwierdź intencję
  przed zapisem, tak jak robi to WebUI.
- Nigdy nie poluzowuj prawdziwej ochrony spójności: SDK jest ograniczone do prawdziwego frameworku przy każdej
  polityce, manufacturer pozostaje w zgodzie z resztą profilu, a profil innego urządzenia jest odrzucany. To
  rozwiązania celowe i nie wolno ich obchodzić.
- Konfiguracja to wspierana powierzchnia. Nie scrapuj ani nie automatyzuj samej WebUI.

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane, zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
