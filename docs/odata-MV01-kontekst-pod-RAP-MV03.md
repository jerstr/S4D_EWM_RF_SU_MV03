# Kontekst OData Przesunięć (MV01) – baza dla nowej usługi CDS/RAP dla MV03 „Uporządkuj”

## Cel

Nowa aplikacja **Uporządkuj** (MV03, BSP `Z075EWM_RF_MV03`) ma dostać **własną, nową usługę OData zbudowaną w CDS/RAP**. Nie będzie korzystać ze wspólnej usługi SEGW `Z075EWM_SR_ODATA01_SRV`, która obsługuje też wiele innych aplikacji.

Dokument zbiera **tylko tę część `Z075EWM_SR_ODATA01_SRV`, której używa aplikacja Przesunięcia (MV01)**, czyli encje `SB_MOVE*` i function importy `SB_MOVE_*`. Opisuje, co UI wysyła, co czyta i jak przebiega sesja. Na tej podstawie można zaprojektować usługę RAP dla MV03.

Ustalenia:
- MV03 startuje jako kopia MV01, więc dziś woła dokładnie te same elementy.
- `Z075EWM_SR_ODATA01_SRV` i aplikacja MV01 zostają **bez zmian**.
- Nowa usługa RAP jest **tylko dla MV03**.

## Źródła

- **Kod UI MV01:** `webapp/controller/Worklist.controller.js`, `webapp/view/Worklist.view.xml`, `webapp/view/MoveDialog.fragment.xml`, `webapp/model/formatter.js`. Stan drzewa roboczego z 04.11.2026, razem z niezacommitowanym wariantem A i walidacją ilości. Ten sam kod jest w MV03, w commicie `97bb9cb`.
- **Typy i długości pól:** najnowsza lokalna kopia `$metadata` usługi, `zs4m_user_list05/webapp/localService/mainService/metadata.xml` z 17.07.2026. Kopia w `localService` MV01 i MV03 jest nieaktualna.
- **Uwaga:** faktyczna usługa jest nowsza niż ta kopia. Pola oznaczone niżej jako „brak w metadata 07.2026” UI już używa, więc backend musi je zwracać. Przed projektowaniem RAP pobierz aktualne `/sap/opu/odata/sap/Z075EWM_SR_ODATA01_SRV/$metadata` i porównaj tylko encje `SB_MOVE*`.
- **Brief backendu wariantu A:** [brief-S4-backend-przesuniecia.md](brief-S4-backend-przesuniecia.md), kopia z MV01. Zawiera pytania o wewnętrzną logikę DPC_EXT: rozpoznanie MS lub kodu, sesja w tabeli Z, `ScanCount`, `SelectionEnabled` N04/M06. Odpowiedzi na nie są też potrzebne do RAP.

## Elementy usługi używane przez MV01

| Element | Rodzaj | Do czego |
|---|---|---|
| `SB_MOVESet` | zbiór encji, klucz `Ui5Guid` | nagłówek sesji skanowania; widok wiązany przez `bindElement("/SB_MOVESet('<Ui5Guid>')")` |
| `toSB_MOVE_Items` | nawigacja 1 → * | tabela pozycji (`items="{toSB_MOVE_Items}"`) |
| `SB_MOVE_ItemsSet` | zbiór encji, klucz `Guid` | pozycje: odczyt, **MERGE** (`QtyByUser`, `Marked`), **DELETE** |
| `toSB_MOVE_Items_OnVlpla` | nawigacja 1 → * | zapas na MS źródłowym w oknie wyboru „Um.w mag.” |
| `SB_MOVE_PrintersSet` | zbiór encji, klucz `PrintDoor` | lista drukarek/bram przy „Um.w Aut.” |
| `SB_MOVE_init` | function import | start i odtworzenie otwartej sesji |
| `SB_MOVE_set_vlpla` | function import | pierwsze pole: MS albo kod materiał+partia |
| `SB_MOVE_set_mat_batch` | function import | dodanie partii; tryb `M` dla „Przen.na M” |
| `SB_MOVE_set_other_items` | function import | zatwierdzenie wyboru pozycji przed MS docelowym |
| `SB_MOVE_to_nlpla` | function import | **księgowanie**, czyli utworzenie zadań magazynowych |
| `SB_MOVE_reset` | function import | wyczyszczenie sesji |

Wszystkie function importy są wywoływane przez `POST` i zwracają encję `SB_MOVE`. Model ma ustawienia: OData V2, `useBatch: false`, `defaultBindingMode: TwoWay`, `defaultCountMode: Inline`.

Przycisk „Zapas” nie korzysta z tej usługi. Nawiguje przez FLP do `ZS4MORIS_EWM_COCKPIT-RF_STOCK`.

## Przebieg sesji i wywołania

**Konwencja odpowiedzi.** Każdy function import zwraca nagłówek z polami `Message` i `MessageType`.
- Przy `MessageType = "E"` UI uznaje wywołanie za błąd i czyści pole skanu.
- Niepusty `Message` przy typie innym niż `I` UI pokazuje jako MessageBox.
- Gdy nie ma błędu, UI zwykle wywołuje `submitChanges()` i `refresh()`, czyli przeładowuje nagłówek i pozycje.

| # | Akcja użytkownika | Wywołanie i parametry | Co UI czyta z odpowiedzi |
|---|---|---|---|
| 1 | Start aplikacji | `SB_MOVE_init` bez parametrów | `Ui5Guid`. Gdy puste, UI generuje własny UUID. Potem `bindElement` na `SB_MOVESet('<Ui5Guid>')` |
| 2 | Skan w pierwszym polu (MS lub kod mat+partia) | `SB_MOVE_set_vlpla(Ui5Guid, Vlpla = surowy skan)` | `Message`, `MessageType`, `StorageType`, `SelectionEnabled`, `Vlpla`. Jeśli `Vlpla` ≠ skan po normalizacji (bez separatorów, wielkie litery), UI uznaje skan za kod mat+partia i ustawia tryb „M” |
| 3a | Kolejny skan kodu w drugim polu (wariant B, po skanie MS) | `SB_MOVE_set_mat_batch(Ui5Guid, Vlpla, ScanMatBatch, mode = "", qtyPCE = "")` | `Message`, `MessageType` |
| 3b | Kolejny skan kodu w pierwszym polu (wariant A, tryb „M”) | jak 3a, z `Vlpla` z nagłówka i `ScanMatBatch` = skan | `Message`, `MessageType` |
| 4 | Zaznaczenie pozycji (checkbox) | `MERGE SB_MOVE_ItemsSet(guid'…')` z polem `Marked` | – (auto-odświeżenie) |
| 5 | Zmiana ilości (Enter lub opuszczenie pola) | `MERGE SB_MOVE_ItemsSet(guid'…')` z polem `QtyByUser` | – (auto-odświeżenie). **Reguła backendu:** `QtyByUser > QuantitySt` przywraca pełną ilość. UI blokuje taką wartość wcześniej |
| 6 | „X” przy pozycji | `DELETE SB_MOVE_ItemsSet(guid'…')` | – |
| 7 | „Um.w mag.”, MS z obowiązkiem HU (`VlplaT331Huobl = "X"`) | `SB_MOVE_set_other_items(Ui5Guid, Vlpla, SelectedItems = "")` | `Message`, `MessageType`; po odświeżeniu `Approved` odblokowuje pole MS docelowego |
| 7' | „Um.w mag.”, pozostałe MS | okno wyboru na `toSB_MOVE_Items_OnVlpla` (wstępnie zaznaczone pozycje z niepustym `Status`), potem `SB_MOVE_set_other_items(…, SelectedItems = "Matnr/Charg,Matnr/Charg,…")` | jak wyżej |
| 8 | Skan MS docelowego | `SB_MOVE_to_nlpla(Ui5Guid, Vlpla, Nlpla, Approved, PrintDoor, HuCount)` | `Message`, `MessageType`. Gdy nie ma błędu, sesja jest gotowa do kolejnego przesunięcia |
| 9 | „Um.w Aut.” | Tylko przy `ScanCount ≤ 1`. Wybór drukarki z `SB_MOVE_PrintersSet` (domyślnie `PrintDoor` z nagłówka) i liczby etykiet, potem `SB_MOVE_to_nlpla(…, Nlpla = "AUTOMAT", PrintDoor, HuCount)` | `Message`, `MessageType` |
| 10 | „Przen.na M” | Tylko przy `ScanCount ≤ 1`. Najpierw `SB_MOVE_set_mat_batch(Ui5Guid, Vlpla, ScanMatBatch, mode = "M", qtyPCE = "")`, potem ponownie z `qtyPCE` = liczba sztuk wpisana przez użytkownika. Na końcu `SB_MOVE_to_nlpla(…, Nlpla = "MOVE_M")` | `MoveMMessage`, `MoveMWeightPce`, `MoveMLenghtPce`, `Message`, `MessageType` |
| 11 | „Reset” | `SB_MOVE_reset(Ui5Guid, Vlpla, ScanMatBatch)` | `Message`, `MessageType`; sesja wyczyszczona |

**Stany UI zależne od danych:**
- **Pierwsze pole skanu** jest zablokowane, gdy `Vlpla` jest wypełnione (poza trybem „M”) albo gdy `Approved` jest ustawione.
- **Drugie pole** jest widoczne przy `Vlpla` wypełnionym, braku `Approved`, braku `SelectionEnabled` i trybie innym niż „M”.
- **Przyciski przesunięcia** są aktywne, gdy lista nie jest pusta, nie ma `Approved` i nie ma błędu ilości.
- **Pole MS docelowego** jest aktywne przy ustawionym `Approved`.
- **Kolumny „Wybór” i „Ilość”** są widoczne przy `SelectionEnabled` i braku pozycji z HU (`HuidentSt`).
- **Pole ilości** jest aktywne, gdy pozycja jest zaznaczona (`Marked`), `Status ≠ "R"` i `CatSt ≠ "F2"`.
- **Kolumny „Klient” i „Schemat”** są widoczne tylko wtedy, gdy któraś pozycja ma odpowiednio `DestLocDescAddr` albo `CutScheme`/`CutCl`.

**Walidacje ilości po stronie UI** (przed `MERGE`):
- `QtyByUser` nie może być większe niż `QuantitySt`.
- Gdy JM = `M` i `RangeFlag` nie jest ustawione: `QtyByUser × PceUmren / PceUmrez` musi dać pełne sztuki.
- Formatter pokazuje przeliczenie na SZT obok pola.

## Encje i pola

Typy pochodzą z metadata 07.2026. Kolumna „UI” mówi, jak MV01 używa pola: **C** czyta, **W** zapisuje, „–” nie używa.

### `SB_MOVE` – nagłówek sesji

| Pole | Typ | Opis | UI |
|---|---|---|---|
| `Ui5Guid` | String(50) | **klucz**, ID sesji | C |
| `Vlpla` | String(18) | MS źródłowe | C |
| `Nlpla` | String(18) | MS docelowe; wartości specjalne `AUTOMAT`, `MOVE_M` | C, W (TwoWay w polu MS docelowego, potem parametr) |
| `ScanMatBatch` | String(100) | ostatni skan materiał/partia | C, W (TwoWay w drugim polu) |
| `Approved` | String(1) | wybór zatwierdzony, czeka na MS docelowe | C |
| `StorageType` | String(4) | typ magazynu `Vlpla` | C |
| `VlplaT331Huobl` | String(1) | obowiązek HU na typie magazynu | C |
| `ScanCount` | Int32 | liczba zeskanowanych partii | C |
| `PrintDoor` | String(4) | domyślna drukarka/brama | C |
| `MoveMMessage` | String(100) | komunikat „Przen.na M” | C |
| `MoveMWeightPce` | Decimal(16,3) | waga teoretyczna [MG] | C |
| `MoveMLenghtPce` | Decimal(16,3) | długość [M] (nazwa z literówką) | C |
| `Message` | String(100) | komunikat | C |
| `MessageType` | String(1) | `E` / `W` / `I` / `S` | C |
| `SelectionEnabled` | Boolean | włącza wybór pozycji i ilości (typy N04/M06) | C, **brak w metadata 07.2026** |
| `Matnr` | String(40) | materiał | – |
| `Charg` | String(10) | partia | – |

### `SB_MOVE_Items` – pozycje sesji

Klucz to `Guid`. Asocjacja `SB_MOVE` 1 → * po `Ui5Guid`.

| Pole | Typ | Opis | UI |
|---|---|---|---|
| `Guid` | Guid | **klucz** | C (ścieżka MERGE/DELETE) |
| `Ui5Guid` | String(50) | sesja | – |
| `Matnr` | String(40) | materiał | C |
| `Charg` | String(10) | partia | C |
| `HuidentSt` | String(20) | HU (gdy wypełnione, brak wyboru i ilości) | C |
| `Vlpla` | String(18) | MS pozycji | C |
| `Maktx` | String(40) | opis materiału | C |
| `QuantitySt` | Decimal(13,3) | ilość zapasu | C |
| `UnitofmeasureSt` | String(3) | JM zapasu | C |
| `QtyByUser` | String(10) | ilość do przesunięcia | C, **W** |
| `Marked` | Boolean | pozycja wybrana | C, **W** |
| `Status` | String(1) | status (`R` blokuje wybór i ilość) | C |
| `StatusIcon` | String(100) | ikona statusu | C |
| `StatusIconColor` | String | kolor ikony | C |
| `DestLocDescAddr` | String(511) | klient: nazwa i adres | C |
| `CutScheme` | String(30) | schemat cięcia | C |
| `CutCl` | String | długość | C |
| `CatSt` | String(2) | rodzaj zapasu (`F2` blokuje ilość) | C, **brak w metadata 07.2026** |
| `PackIcon` | String | ikona opakowania | C, **brak w metadata 07.2026** |
| `PceUmrez` | Decimal | przelicznik: strona JM zapasu | C, **brak w metadata 07.2026** |
| `PceUmren` | Decimal | przelicznik: strona SZT | C, **brak w metadata 07.2026** |
| `RangeFlag` | Boolean | materiał zakresowy (bez wymogu pełnych sztuk) | C, **brak w metadata 07.2026** |

Pola zwracane przez backend, ale nieużywane w UI: `SbMoveVlpla`, `Nlpla`, `WarehouseSt`, `StorageTypeSt`, `StorageBinSt`, `ProductSt`, `BatchSt`, `BaseunitSt`, `Qty`, `Confirmed`, `OpentWtSt`, `CounterSt`, `ScanSt`, `Erdat`, `Erzet`, `Ernam`, `Message`, `MessageType`. W RAP można je pominąć albo zostawić jako techniczne.

### `SB_MOVE_Items_OnVlpla` – zapas na MS źródłowym (okno wyboru)

Ma ten sam układ co `SB_MOVE_Items` (oraz `Mandt`, `MandtSt`). UI czyta: `Matnr`, `Charg`, `Vlpla`, `Status` (wstępne zaznaczenie), `Maktx`, `CutCl`, `QuantitySt`, `UnitofmeasureSt`.

### `SB_MOVE_Printers`

| Pole | Typ | Opis | UI |
|---|---|---|---|
| `PrintDoor` | String(4) | **klucz**, drukarka/brama | C |

## Wymagania dla nowej usługi CDS/RAP (MV03)

### Zakres na start

Usługa ma odwzorować powyższy kontrakt, żeby MV03 (dziś kopia MV01) działało na niej po zmianie nazw. Logikę „Uporządkuj” dołożymy w kolejnym kroku (sekcja niżej).

| Dziś (SEGW) | Proponowany odpowiednik RAP |
|---|---|
| `SB_MOVE` + tabela sesji Z | root BO, np. `ZR_EWM_MV03_Session`, klucz `Ui5Guid` (lub UUID) |
| `SB_MOVE_Items` | child BO, np. `ZR_EWM_MV03_Item`, composition od sesji; `update` tylko `QtyByUser` i `Marked`; `delete` dozwolone |
| `SB_MOVE_Items_OnVlpla` | CDS tylko do odczytu (zapas na MS), asocjacja z sesji |
| `SB_MOVE_Printers` | CDS tylko do odczytu / value help |
| `SB_MOVE_init`, `set_vlpla`, `set_mat_batch`, `set_other_items`, `to_nlpla`, `reset` | akcje RAP z parametrami w abstract entity; istniejący kod EWM (tworzenie zadań magazynowych) wywoływany z akcji |

### Decyzje do podjęcia

1. **OData V2 czy V4.**
   - UI to UI5 1.71 i `ODataModel` v2: `callFunction`, `createKey`, `submitChanges`, TwoWay.
   - **Rekomendacja:** service binding **OData V2 – UI**. Wtedy w UI zmieniamy tylko nazwy usługi, encji i akcji.
   - V4 oznacza przepisanie warstwy danych i podniesienie wersji UI5.
2. **Komunikaty.**
   - **Opcja a:** pola `Message` i `MessageType` w wyniku akcji. To minimalna zmiana w UI.
   - **Opcja b:** standard RAP, czyli `reported`/`failed` i nagłówek `sap-message`. Czystsze, ale wymaga przebudowy obsługi błędów w UI.
3. **Managed czy unmanaged.** Sesja i pozycje w nowych tabelach Z (managed), a księgowanie przez istniejące klasy. Druga możliwość to unmanaged nad obecną tabelą sesji. Warunek: MV01 i MV03 nie mogą dzielić sesji.
4. **Typy.**
   - `QtyByUser` jako Decimal z JM zamiast String(10).
   - Walidacja `QtyByUser ≤ QuantitySt` zwraca błąd zamiast cicho przywracać ilość.
5. **Tryb skanu.** Pole `ScanMode` (`B` = MS, `M` = kod mat+partia) w nagłówku zamiast wyliczania po stronie UI.

### Rozszerzenie „Uporządkuj” (do ustalenia)

- **Tabela strategii w S4**, struktura do ustalenia. Robocze pola: magazyn, materiał/partia lub kryterium, MS źródłowe, MS docelowe, ilość i JM, priorytet/kolejność, status, wykonał/kiedy.
- **Odczyt propozycji:** CDS „zadania do uporządkowania” dla użytkownika i magazynu.
- **Prowadzenie:** użytkownik dostaje zadanie, potwierdza MS źródłowe, skanuje partię, potwierdza ilość i MS docelowe. Księgowanie idzie przez tę samą akcję co `to_nlpla`, a status zadania w strategii jest aktualizowany.
- Elementy MV01 prawdopodobnie zbędne w Uporządkuj: Um.w Aut. (`AUTOMAT`, drukarki), Przen.na M, okno wyboru pozycji, logika N04/M06. Do potwierdzenia.

### Kryteria odbioru (etap 1: kontrakt jak MV01)

MV03 na nowej usłudze przechodzi te same scenariusze co MV01 na starej:
- wariant B: MS, potem kolejne kody;
- wariant A: kod mat+partia w pierwszym polu, kolejne kody z tego samego MS;
- Um.w mag. z wyborem pozycji i bez niego (MS z HU), Um.w Aut., Przen.na M;
- zmiana ilości i wybór pozycji dla N04/M06;
- usunięcie pozycji, Reset, odtworzenie sesji po ponownym otwarciu aplikacji.

Ani `Z075EWM_SR_ODATA01_SRV`, ani MV01 nie są zmieniane.
