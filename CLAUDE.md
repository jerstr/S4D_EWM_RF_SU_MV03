# MV03 „Uporządkuj” – kontekst projektu

## Czym jest ten projekt

- Aplikacja RF EWM (SAPUI5 1.71, OData V2, szablon worklist) **„Uporządkuj”**.
- Ma prowadzić użytkownika: co przesunąć, skąd i dokąd. Dane mają pochodzić ze strategii zapisanych w tabeli w S4 (struktura do ustalenia).
- Powstała 04.11.2026 jako **pełna kopia** aplikacji Przesunięcia (`/home/user/projects/S4D_EWM_RF_SU_MV01`). Dostosowanie do „Uporządkuj” przyjdzie później.

Tożsamość aplikacji:

| | MV03 (ten projekt) | MV01 (źródło) |
|---|---|---|
| Namespace | `ewm.s4m.S4D_EWM_RF_SB_MOVE03.S4D_EWM_RF_SU_MV03` | `…MOVE01.…MV01` |
| BSP | `Z075EWM_RF_MV03`, pakiet `Z075EWM_SR_UI` | `Z075EWM_RF_MV01` |
| Transport | `DO_UZUPELNIENIA` w `ui5-deploy.yaml`, celowo, żeby deploy nie poszedł bez nowego transportu | – |
| Intent (sandbox) | `Uporzadkuj-display` | `Przesuniecia-display` |
| Usługa OData | na razie `Z075EWM_SR_ODATA01_SRV` (jak MV01); docelowo **nowa usługa CDS/RAP tylko dla MV03** | `Z075EWM_SR_ODATA01_SRV` |

## Twarde zasady

- **MV01 (`/home/user/projects/S4D_EWM_RF_SU_MV01`) wolno tylko czytać.** Żadnych zmian, commitów ani deployów. Wszystkie analizy, dokumenty i zmiany zapisujemy w MV03.
- Nie zmieniamy `Z075EWM_SR_ODATA01_SRV`. Usługa obsługuje też GR01, GI01, LO01, ST03 i USR01.
- Commity kończymy linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push dopiero po podaniu przez użytkownika URL nowego repo. Dziś repo nie ma remote, gałąź `main`.
- Teksty UI piszemy po polsku, komentarze w kodzie po angielsku. Styl kodu jak w istniejącym kontrolerze: zmienne globalne modułu (`oSourceG`, `thisView`, `gPrinter`…), `callFunction` + `MessageBox`.

## Dokumenty

- **[docs/odata-MV01-kontekst-pod-RAP-MV03.md](docs/odata-MV01-kontekst-pod-RAP-MV03.md)** – pełny kontrakt OData używany przez MV01. Zawiera:
  - encje i pola, z oznaczeniem, które UI czyta i zapisuje;
  - przebieg sesji i wywołania `SB_MOVE_*`;
  - wymagania i decyzje dla nowej usługi CDS/RAP dla MV03.
  
  To podstawa do zlecenia usługi w S4.
- **[docs/brief-S4-backend-przesuniecia.md](docs/brief-S4-backend-przesuniecia.md)** – brief dla sesji z dostępem do S4 (wariant A w MV01): pytania o logikę DPC_EXT. Kopia z MV01.

## Stan kodu (odziedziczony z MV01 na 04.11.2026)

- **Dwa warianty skanowania w pierwszym polu:**
  - **B:** najpierw MS, potem kody w drugim polu.
  - **A:** od razu kod materiał+partia, kolejne kody w tym samym polu.
  
  Tryb (`worklistView>/scanMode` = `B`/`M`) UI wylicza po stronie klienta. Porównuje `Vlpla` zwrócone przez backend z surowym skanem (`_normalizeScan`). Docelowo backend ma zwracać pole `ScanMode`.
- **Pozycje z HU (`HuidentSt`)** chowają kolumny wyboru i ilości (`hasHuItems`).
- **Walidacja ilości w `onQtyliveChange`** (przed `MERGE`):
  - `QtyByUser ≤ QuantitySt`, z komunikatem „Ilość nie może przekroczyć zapasu (…)”;
  - dla JM `M` bez `RangeFlag` ilość musi dać pełne sztuki SZT (`PceUmrez`/`PceUmren`).
  
  Backend od zawsze przywraca pełną ilość, gdy wpisana przekracza zapas. Dlatego walidacja jest w UI.
- **Kolumny „Klient” i „Schemat”** są ukryte, gdy żadna pozycja nie ma danych.
- **Lokalny `webapp/localService/metadata.xml` jest nieaktualny**, ma stan z 2024. Najnowsza lokalna kopia `$metadata` usługi: `/home/user/projects/zs4m_user_list05/webapp/localService/mainService/metadata.xml` (07.2026). Też nie zawiera pól `SelectionEnabled`, `CatSt`, `PackIcon`, `PceUmrez`, `PceUmren`, `RangeFlag`.

## Otwarte sprawy

1. URL nowego repo GitHub: dodać remote i zrobić push.
2. Transport dla `Z075EWM_RF_MV03`, potem kafelek i target mapping w FLP.
3. Struktura tabeli strategii w S4 oraz projekt usługi CDS/RAP. Decyzje są w dokumencie OData: V2 czy V4, sposób przekazywania komunikatów, managed czy unmanaged.
4. Przepływ „Uporządkuj”: lista zadań, potwierdzenie MS źródłowego, skan partii, ilość, MS docelowe. Do wycięcia prawdopodobnie Um.w Aut., Przen.na M, okno wyboru pozycji i logika N04/M06, do potwierdzenia.

## Uruchamianie

- `npm start` – FLP sandbox, backend przez destination `S4D_100`.
- `npm run start-mock` – mockserver; metadata nieaktualne.
- `npm run deploy` – dopiero po uzupełnieniu transportu w `ui5-deploy.yaml`.
