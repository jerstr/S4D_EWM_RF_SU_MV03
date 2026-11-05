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
| Transport | `S4DK929808` (UI i backend RAP) | – |
| Deploy | destination `S4D_100`, klient `100` (`S4D_010` zwraca w BAS 401) | `S4D_010` |
| Intent (sandbox) | `Uporzadkuj-display` | `Przesuniecia-display` |
| Usługa OData | **`ZUI_S4M_EWM_MV03_O2`** (RAP, OData V2, od 05.11.2026) | `Z075EWM_SR_ODATA01_SRV` |

## Twarde zasady

- **MV01 (`/home/user/projects/S4D_EWM_RF_SU_MV01`) wolno tylko czytać.** Żadnych zmian, commitów ani deployów. Wszystkie analizy, dokumenty i zmiany zapisujemy w MV03.
- Nie zmieniamy `Z075EWM_SR_ODATA01_SRV`. Usługa obsługuje też GR01, GI01, LO01, ST03 i USR01.
- Commity kończymy linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push dopiero po podaniu przez użytkownika URL nowego repo. Dziś repo nie ma remote, gałąź `main`.
- Teksty UI piszemy po polsku, komentarze w kodzie po angielsku. Styl kodu jak w istniejącym kontrolerze: zmienne globalne modułu (`oSourceG`, `thisView`, `gPrinter`…), `callFunction` + `MessageBox`.

## Dokumenty

- **[docs/MV03-przepiecie-UI-na-RAP.md](docs/MV03-przepiecie-UI-na-RAP.md)** – opis nowej usługi RAP `ZUI_S4M_EWM_MV03_O2`. Zawiera:
  - różnice względem MV01: nawigacje `to_SB_MOVE_Items` i `to_SB_MOVE_Items_OnVlpla`, parametr `MoveMode` zamiast `mode`;
  - zachowanie usługi: tabele sesji `ZS4M_EWM_MV03_H` i `ZS4M_EWM_MV03_I`;
  - testy backendu;
  - co przepięto w UI.
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
- **`webapp/localService/metadata.xml`** = `$metadata` usługi `ZUI_S4M_EWM_MV03_O2` pobrane 05.11.2026 z S4D/100. Odświeżanie: `curl "http://S4D_100.dest/sap/opu/odata/sap/ZUI_S4M_EWM_MV03_O2/\$metadata?sap-client=100"`. W BAS destinations są dostępne jako `http://<nazwa>.dest`.

## Otwarte sprawy

1. URL nowego repo GitHub: dodać remote i zrobić push.
2. Kafelek i target mapping w FLP dla `Z075EWM_RF_MV03`.
3. Test w UI na S4D wywołań księgujących (`SB_MOVE_to_nlpla`: MS docelowe, `AUTOMAT`, `MOVE_M`), bo backend ich nie testował automatycznie.
4. Struktura tabeli strategii w S4 i jej rozszerzenie w usłudze RAP.
5. Przepływ „Uporządkuj”: lista zadań, potwierdzenie MS źródłowego, skan partii, ilość, MS docelowe. Do wycięcia prawdopodobnie Um.w Aut., Przen.na M, okno wyboru pozycji i logika N04/M06, do potwierdzenia.

## Uruchamianie

- `npm start` – FLP sandbox, backend przez destination `S4D_100`.
- `npm run start-mock` – mockserver na metadata nowej usługi.
- Deploy: `npm run build`, potem `npx fiori deploy --config ui5-deploy.yaml -y` (`npm run deploy` pyta interaktywnie o potwierdzenie).
