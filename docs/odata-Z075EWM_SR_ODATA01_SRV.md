# Serwis `Z075EWM_SR_ODATA01_SRV` – inwentaryzacja i wydzielenie do CDS/RAP

## Cel

`Z075EWM_SR_ODATA01_SRV` (SEGW, OData V2) obsługuje dziś kilka aplikacji Fiori/RF EWM naraz: przyjęcia, wydania, załadunek, zapas, dane użytkownika i przesunięcia. Dokument:

1. spisuje wszystkie elementy serwisu i przypisuje je do aplikacji;
2. opisuje dokładnie część **Przesunięcia** (`SB_MOVE*`), która ma przejść do nowego serwisu CDS/RAP;
3. podaje wymagania dla nowego serwisu, z którego skorzystają Przesunięcia (MV01, MV02) i nowa aplikacja **Uporządkuj** (MV03).

Pozostałe aplikacje zostają na starym serwisie. Nie trzeba go zmieniać ani wyłączać.

## Źródła i zastrzeżenia

- **Struktura serwisu** pochodzi z `zs4m_user_list05/webapp/localService/mainService/metadata.xml` (stan na 17.07.2026). To najnowsza kopia `$metadata` w lokalnych projektach. Kopie w MV01/MV02 są z 2024 r. i mocno nieaktualne.
- **Faktyczny serwis jest nowszy niż ta kopia.** UI Przesunięć (MV01) używa pól, których w niej nie ma: `SelectionEnabled` (nagłówek) oraz `CatSt`, `PackIcon`, `PceUmrez`, `PceUmren`, `RangeFlag` (pozycje). **Przed zleceniem pobierz aktualne `$metadata`** z `/sap/opu/odata/sap/Z075EWM_SR_ODATA01_SRV/$metadata` i porównaj z tym dokumentem.
- **Przypisanie do aplikacji** wynika z przeszukania kodu UI (kontrolery i widoki, bez `localService` i `test`) w projektach w `/home/user/projects`. Elementy oznaczone „brak użycia” mogą być używane przez aplikacje spoza tego katalogu. Sprawdź to w S4, np. w `/IWFND/TRACES`, `/IWFND/STATS` albo przez where-used w DPC_EXT.
- Wszystkie zbiory encji mają w metadanych `creatable/updatable/deletable = false`. Mimo to MV01 robi `MERGE` i `DELETE` na `SB_MOVE_ItemsSet` (szczegóły niżej). DPC_EXT najwyraźniej obsługuje te operacje niezależnie od adnotacji.

## Aplikacje korzystające z serwisu

| Aplikacja (projekt UI) | BSP | Tytuł | Obszar serwisu |
|---|---|---|---|
| S4D_EWM_RF_GR01 | Z075EWM_RF_GR01 | Przyjęcia | Transport / HU / Putaway / ważenie |
| S4D_EWM_RF_GI01 | Z075EWM_RF_GI01 | Wydania | GI_* / ważenie |
| S4D_EWM_RF_LO01 | Z075EWM_RF_LO01 | Załadunek | LO_* |
| S4D_EWM_RF_ST03 | Z075EWM_STOCK03 | Zapas | Stock / SB_Doors / GI_Mat |
| S4D_EWM_RF_USR01 | Z075EWM_RF_US01 | Dane użytkownika | User |
| zs4m_user_list05 | – | User List (Fiori elements) | User |
| **S4D_EWM_RF_SU_MV01** | **Z075EWM_RF_MV01** | **Przesunięcia** | **SB_MOVE*** |
| **S4D_EWM_RF_SU_MV02** | **Z075EWM_RF_MV02** | **Przesunięcie Stół – Podłoga** | **SB_MOVE*** |
| **S4D_EWM_RF_SU_MV03** | **Z075EWM_RF_MV03** | **Uporządkuj** (nowa) | **SB_MOVE*** + strategie |

## Inwentaryzacja elementów serwisu

Razem: 37 typów encji, 37 zbiorów encji, 23 function importy.

### Zbiory encji

| Zbiór encji | Typ / klucz | Nawigacje | Używa |
|---|---|---|---|
| `SB_MOVESet` | `SB_MOVE` / `Ui5Guid` | `toSB_MOVE_Items`, `toSB_MOVE_Items_OnVlpla` | **MV01, MV02** |
| `SB_MOVE_ItemsSet` | `SB_MOVE_Items` / `Guid` | – | **MV01, MV02** (odczyt, MERGE, DELETE) |
| `SB_MOVE_Items_OnVlplaSet` | `SB_MOVE_Items_OnVlpla` / `Guid` | – | **MV01, MV02** (przez nawigację) |
| `SB_MOVE_PrintersSet` | `SB_MOVE_Printers` / `PrintDoor` | – | **MV01, MV02** |
| `TransportSet` | `Transport` / `TorId` | `toHU`, `toTranExt`, `toPutaway` | GR01 |
| `TransportExtSet` | `TransportExt` / `TorId` | – | GR01 (nawigacja) |
| `HUSet` | `HU` / `GuidParent` | – | GR01 (nawigacja) |
| `PutawaySet` | `Putaway` / `Productno`, `Nlpla` | – | GR01 (nawigacja) |
| `GR_PackDiaSet` | `GR_PackDia` / `TorId`, `DestLocDescAddr`, `Door` | – | GR01 |
| `Z075EWM_I_STOCK_02` | CDS / `warehouse`, `Storage_type`, `Storage_bin`, `product`, `batch` | – | GR01 |
| `GI_MatSet` | `GI_Mat` / `GuidParent` | `toGI_Batch`, `toGI_BatchJoin`, `toGI_Pack`, `toGI_SBin`, `toGI_Scales` | GI01, ST03 |
| `GI_BatchSet`, `GI_BatchJoinSet`, `GI_PackSet`, `GI_SBinSet`, `GI_ScalesSet` | podrzędne `GI_Mat` | – | GI01 (nawigacje) |
| `LO_TranSet` | `LO_Tran` / `TorId` | `to_LO_Tran_Attach`, `toLO_HUall`, `toLO_Pack`, `toLO_Loc` | LO01 |
| `LO_LocSet` | `LO_Loc` / `TorId`, `DestLocDescAddr` | `toAttach`, `toLO_Door`, `toLO_HU` | LO01 |
| `LO_HUSet` | `LO_HU` / `GuidHu32`, `TorId` | `toLO_HUcont` | LO01, GR01 (nawigacja) |
| `LO_HUallSet`, `LO_HUcontSet`, `LO_PackSet`, `LO_LocDoorSet`, `LO_AttachmentSet` | podrzędne LO | – | LO01 (nawigacje) |
| `LO_PackDiaSet` | `LO_PackDia` / `TorId`, `DestLocDescAddr`, `Door` | – | LO01 |
| `StockSet` | `Stock` / `GuidStock32`, `Matnr` | – | ST03 |
| `SB_DoorsSet` | `SB_Doors` / `Lgnum`, `Lgpla`, `Lgtyp` | – | ST03 |
| `UserSet` | `User` / `Uname` | – | USR01, zs4m_user_list05 |
| `AudioURISet` | `AudioURI` / `AudioContentKey` | – | GR01, GI01, LO01 |
| `ProductSet` | `Product` / `Matnr` | `toStock` | brak użycia |
| `Product2Set` | `Product2` / `Matnr` | – | brak użycia |
| `VHLgtypSet` | `VHLgtyp` / `Lgtyp` | – | brak użycia |
| `Scale_infoSet` | `Scale_info` / `Mandt`, `ScalesId` | – | brak użycia |
| `UserNotificationSet` | `UserNotification` / `NotificationId`, `Uname`, `MessageType` | – | brak użycia |
| `ShUsr01Set` | `ShUsr01` / `Bname` | – | brak użycia |
| `I_ProdEWMWarehouse` | CDS / `ProductUUID`, `SupplyChainUnitUUID`, `BusinessPartnerUUID` | – | brak użycia |
| `Z075EWM_SRCO_TM09` | CDS / `db_key`, `parent_key`, `tor_cat`, `tor_id` | – | brak użycia |

### Function importy

Wszystkie są wywoływane metodą POST.

| Function import | Parametry | Zwraca | Używa |
|---|---|---|---|
| `SB_MOVE_init` | – | `SB_MOVE` | **MV01, MV02** |
| `SB_MOVE_set_vlpla` | `Ui5Guid`(50), `Vlpla`(18) | `SB_MOVE` | **MV01, MV02** |
| `SB_MOVE_set_mat_batch` | `Ui5Guid`(50), `Vlpla`(18), `ScanMatBatch`(100), `mode`(20), `qtyPCE`(10) | `SB_MOVE` | **MV01, MV02** |
| `SB_MOVE_set_other_items` | `Ui5Guid`(50), `Vlpla`(18), `SelectedItems`(500) | `SB_MOVE` | **MV01, MV02** |
| `SB_MOVE_to_nlpla` | `Ui5Guid`(50), `Vlpla`(18), `Nlpla`(18), `Approved`(1), `PrintDoor`(20), `HuCount`(10) | `SB_MOVE` | **MV01, MV02** |
| `SB_MOVE_reset` | `Ui5Guid`(50), `Vlpla`(18), `ScanMatBatch`(100) | `SB_MOVE` | **MV01, MV02** |
| `PutawaySetScaleWeightAndPrepare` | `TorId`, `Huident`, `Productno`, `Nlpla`, `scaleWeight`, `mode`, `LengthMode`, `Length` | `Transport` | GR01 |
| `PutawaySetScannedFlagforHU` | `TorId`, `Huident`, `HuidentVerif` | `HU` | GR01 |
| `PutawayConfirmDestBIN` | `TorId`, `Huident`, `Productno`, `Nlpla`, `NlplaVerif`, `NumOfLinesPerc` | `Transport` | GR01 |
| `PutawayResetScan` | `TorId`, `mode` | `Transport` | GR01 |
| `PutawayRefresh` | `TorId` | `Transport` | GR01 |
| `PutawayManualWeighing` | `TorId`, `GWeight`, `Workstation` | `Transport` | GR01 |
| `PutawayScaleTara` | `TorId`, `ScalesId`, `scaleWeight` | `Transport` | GR01, GI01 |
| `PutawayCreateWTforHU` | `TorId`, `Huident`, `HuidentVerif` | `HU` | brak użycia |
| `PutawayNextWeighing` | `TorId` | `Transport` | brak użycia |
| `GI_MatProc` | `iMode` | `GI_Mat` | GI01 |
| `GI_MatBatchProc` | `iMode` | `GI_Batch` | GI01 |
| `LO_Proc` | `iMode`, `TorId` | `LO_Tran` | LO01 |
| `StockProc` | `iMode` | `Stock` | ST03 |
| `StockMergeBatch` | `Matnr`, `GuidStock32`, `DestBatch` | `Stock` | brak użycia |
| `StockSetDestBatch` | `Matnr`, `GuidStock32`, `DestBatch` | `Stock` | brak użycia |
| `updateUser` | `Uname`, `Confirmed`, `iButID` | `User` | USR01 |
| `text2audioURI` | `iText` | `AudioURI` | GR01, GI01, LO01 |

GI01 zawiera w kodzie wywołania `SB_MOVE_*` (`OnReset`, `onVlpla`, `onNlpla`, `onScanMatBatch`), ale żaden widok ich nie podpina. To martwy kod skopiowany z Przesunięć i nie blokuje migracji.

## Część do wydzielenia: Przesunięcia (`SB_MOVE*`)

### Model działania (sesja skanowania)

1. **Start:** `SB_MOVE_init` zwraca `Ui5Guid` otwartej sesji użytkownika, jeśli taka istnieje. W przeciwnym razie UI generuje nowy GUID. Widok wiąże się z `/SB_MOVESet('<Ui5Guid>')`, a tabela z `toSB_MOVE_Items`.
2. **Skan MS źródłowego albo kodu materiał+partia:** `SB_MOVE_set_vlpla`. Backend ustawia `Vlpla` w nagłówku, `StorageType`, `SelectionEnabled` i ewentualnie pozycje.
3. **Skan kolejnych partii:** `SB_MOVE_set_mat_batch`, który dodaje pozycję. `mode = "M"` i `qtyPCE` służą do „Przen.na M”.
4. **Edycja pozycji (TwoWay):** `MERGE` na `SB_MOVE_ItemsSet` z polami `QtyByUser` (ilość wpisana przez użytkownika) i `Marked` (wybór pozycji). UI wysyła `submitChanges()`, a model po zapisie przeładowuje listę.
   - **Reguła backendu:** jeśli `QtyByUser > QuantitySt`, przywracana jest pełna ilość. UI od wersji MV01/MV03 blokuje taką wartość wcześniej.
5. **Usunięcie pozycji:** `DELETE` na `SB_MOVE_ItemsSet('<Guid>')`.
6. **„Um.w mag.”:**
   - Gdy `VlplaT331Huobl = 'X'`, UI otwiera okno wyboru na `toSB_MOVE_Items_OnVlpla`, potem wywołuje `SB_MOVE_set_other_items` z `SelectedItems = "Matnr/Charg,..."`.
   - Następnie użytkownik podaje MS docelowe, a UI wywołuje `SB_MOVE_to_nlpla`.
7. **„Um.w Aut.”:**
   - Dozwolone tylko przy `ScanCount <= 1`.
   - UI pyta o drukarkę (`SB_MOVE_PrintersSet`) i liczbę etykiet.
   - Wywołuje `SB_MOVE_to_nlpla` z `Nlpla = "AUTOMAT"`, `PrintDoor` i `HuCount`.
8. **„Przen.na M”:**
   - `SB_MOVE_set_mat_batch` z `mode = "M"` zwraca `MoveMMessage`, `MoveMWeightPce` i `MoveMLenghtPce`.
   - Po potwierdzeniu UI wywołuje `SB_MOVE_to_nlpla` z `Nlpla = "MOVE_M"`.
9. **Reset:** `SB_MOVE_reset` czyści sesję.

**Konwencja odpowiedzi:** każdy function import zwraca nagłówek `SB_MOVE` z polami `Message` i `MessageType`. `E` oznacza błąd, a niepusty komunikat przy typie innym niż `I` UI pokazuje jako MessageBox.

### `SB_MOVE` (nagłówek sesji), klucz `Ui5Guid`

| Pole | Typ | Opis | Uwagi |
|---|---|---|---|
| `Ui5Guid` | String(50) | ID sesji | klucz |
| `Vlpla` | String(18) | MS źródłowe | |
| `Nlpla` | String(18) | MS docelowe | też `AUTOMAT`, `MOVE_M` |
| `ScanMatBatch` | String(100) | ostatni skan materiał/partia | |
| `Matnr` | String(40) | materiał | |
| `Charg` | String(10) | partia | |
| `StorageType` | String(4) | typ magazynu `Vlpla` | |
| `VlplaT331Huobl` | String(1) | obowiązek HU na typie magazynu | |
| `Approved` | String(1) | sesja zatwierdzona, można podać MS docelowe | |
| `ScanCount` | Int32 | liczba zeskanowanych partii | blokady Um.w Aut. i Przen.na M |
| `PrintDoor` | String(4) | domyślna drukarka/brama | |
| `MoveMMessage` | String(100) | komunikat „Przen.na M” | |
| `MoveMWeightPce` | Decimal(16,3) | waga teoretyczna [MG] | |
| `MoveMLenghtPce` | Decimal(16,3) | długość [M] | literówka „Lenght” w nazwie pola |
| `Message` | String(100) | komunikat | |
| `MessageType` | String(1) | `E`/`W`/`I`/`S` | |
| `SelectionEnabled` | Boolean | wybór pozycji i ilości (typy N04/M06) | **brak w metadata z 07.2026** |
| `ScanMode` | String(1) | `B` (miejsce) / `M` (kod mat+partia) | **propozycja, jeszcze nie istnieje.** MV01 wylicza to dziś po stronie UI |

### `SB_MOVE_Items` (pozycje sesji), klucz `Guid`

Asocjacja `SB_MOVE` 1 → * `SB_MOVE_Items` po `Ui5Guid`.

| Pole | Typ | Opis | Uwagi |
|---|---|---|---|
| `Guid` | Guid | klucz pozycji | |
| `Ui5Guid` | String(50) | sesja | FK |
| `Matnr`, `Maktx`, `Charg` | String(40/40/10) | materiał, opis, partia | |
| `HuidentSt` | String(20) | HU | gdy wypełnione, UI ukrywa wybór i ilość |
| `Vlpla`, `SbMoveVlpla`, `Nlpla` | String(18) | MS źródłowe pozycji / sesji / docelowe | |
| `WarehouseSt`, `StorageTypeSt`, `StorageBinSt` | String(4/4/18) | lokalizacja zapasu | |
| `ProductSt`, `BatchSt` | String(40/10) | produkt i partia z zapasu | |
| `QuantitySt` | Decimal(13,3) | ilość zapasu | |
| `UnitofmeasureSt`, `BaseunitSt` | String(3) | JM | |
| `QtyByUser` | String(10) | ilość wpisana przez użytkownika | **edytowalne (MERGE)**; typ znakowy, w RAP lepiej Decimal |
| `Qty` | Decimal(10,3) | ilość | |
| `Marked` | Boolean | pozycja wybrana | **edytowalne (MERGE)** |
| `Status` | String(1) | status przesunięcia | `R` blokuje edycję |
| `StatusIcon`, `StatusIconColor` | String | ikona i kolor statusu | |
| `Confirmed` | String(1) | potwierdzone | |
| `OpentWtSt`, `CounterSt` | Int32 / Byte | otwarte zadania magazynowe / licznik | |
| `ScanSt` | String(70) | kod skanu | |
| `DestLocDescAddr` | String(511) | klient: nazwa i adres | kolumna „Klient” |
| `CutScheme`, `CutCl` | String(30) / String | schemat cięcia, długość | kolumna „Schemat” |
| `Erdat`, `Erzet`, `Ernam` | Date / Time / String(12) | utworzenie | |
| `Message`, `MessageType` | String(100/1) | komunikat pozycji | |
| `CatSt` | String(2) | rodzaj zapasu | `F2` blokuje ilość. **Brak w metadata z 07.2026** |
| `PackIcon` | String | ikona opakowania | **brak w metadata z 07.2026** |
| `PceUmrez`, `PceUmren` | Decimal | przelicznik JM magazynowej ↔ SZT | walidacja pełnych sztuk. **Brak w metadata z 07.2026** |
| `RangeFlag` | Boolean | materiał „zakresowy” (bez wymogu pełnych sztuk) | **brak w metadata z 07.2026** |

### `SB_MOVE_Items_OnVlpla`

Ma te same pola co `SB_MOVE_Items` oraz `Mandt` i `MandtSt`. To lista zapasu na `Vlpla` do wyboru w oknie „Um.w mag.”, dostępna przez nawigację `toSB_MOVE_Items_OnVlpla`.

### `SB_MOVE_Printers`

Zawiera jedno pole, `PrintDoor` String(4), które jest kluczem. To lista drukarek/bram dla etykiet przy „Um.w Aut.”.

## Wymagania dla nowego serwisu CDS/RAP

### Zakres

- **Przejmuje:** wszystko z sekcji „Część do wydzielenia”, czyli nagłówek sesji, pozycje, zapas na MS, drukarki i 6 operacji `SB_MOVE_*`.
- **Dochodzi dla „Uporządkuj”:** odczyt propozycji przesunięć z tabeli strategii. Struktura tabeli jest jeszcze do ustalenia. Robocza lista pól: magazyn, materiał/partia, MS źródłowe, MS docelowe, ilość i JM, priorytet/kolejność, status, kto i kiedy wykonał.
- **Bez zmian:** stary `Z075EWM_SR_ODATA01_SRV` zostaje dla GR01, GI01, LO01, ST03, USR01 i user_list. Element `SB_MOVE*` można z niego usunąć dopiero po przełączeniu MV01 i MV02.

### Kluczowe decyzje

1. **OData V2 czy V4.**
   - Aplikacje są pisane pod `sap.ui.model.odata.v2.ODataModel` (UI5 1.71: `callFunction`, `createKey`, `submitChanges`).
   - **Rekomendacja:** service binding RAP **OData V2 – UI**. Zmiany w UI ograniczą się wtedy do nazw. Przejście na V4 oznacza przepisanie warstwy danych we wszystkich trzech aplikacjach i podniesienie wersji UI5.
2. **Function importy → akcje RAP.**
   - Proponowane odwzorowanie: `init`, `set_vlpla`, `set_mat_batch`, `set_other_items`, `to_nlpla` i `reset` jako akcje na encji `SB_MOVE`, instancyjne albo statyczne, z parametrami w abstract entity.
   - Nazwy i sposób przekazywania parametrów w V2 będą inne niż dziś. UI dostosujemy do nich.
3. **Komunikaty.**
   - **Opcja a:** zachować pola `Message` i `MessageType` w wyniku akcji. To minimalna zmiana w UI.
   - **Opcja b:** przejść na mechanizm RAP (`reported` / `failed`, nagłówek `sap-message`, `MessageManager` w UI). Takie rozwiązanie jest czystsze, ale wymaga przepisania obsługi błędów w UI.
   - Wybór opcji do decyzji.
4. **Sesja.**
   - Dziś sesja jest trzymana w tabeli Z i odtwarzana przez `SB_MOVE_init`.
   - W RAP: tabela sesji jako persistent table BO z polem `Ui5Guid` jako UUID oraz tabela pozycji jako child.
   - Do decyzji: managed czy unmanaged. Księgowanie (zadania magazynowe EWM) i tak zostaje w istniejącym kodzie ABAP wywoływanym z akcji, bez przepisywania.
5. **Edycja pozycji.**
   - Pola `update` w behavior: tylko `QtyByUser` i `Marked`.
   - Walidacja `QtyByUser <= QuantitySt` w RAP powinna zwracać błąd zamiast przywracać ilość po cichu.
   - `QtyByUser` jako Decimal z JM zamiast String(10).
   - `delete` jest dozwolone na pozycji.
6. **Pola brakujące w metadata z 07.2026** (`SelectionEnabled`, `CatSt`, `PackIcon`, `PceUmrez`, `PceUmren`, `RangeFlag`) oraz proponowane `ScanMode` muszą trafić do nowego modelu.

### Kryteria odbioru

- MV01 po przełączeniu na nowy serwis przechodzi te same scenariusze co dziś:
  - wariant B: MS, potem kolejne kody;
  - wariant A: kod mat+partia w pierwszym polu;
  - Um.w mag. z wyborem pozycji, Um.w Aut. z drukiem, Przen.na M;
  - zmiana ilości i wybór pozycji dla N04/M06;
  - usunięcie pozycji, Reset, odtworzenie sesji po ponownym otwarciu.
- MV02 działa bez zmian funkcjonalnych.
- Uporządkuj czyta listę propozycji ze strategii i księguje przez tę samą akcję co `to_nlpla`.
- Stary serwis nadal obsługuje GR01, GI01, LO01, ST03 i USR01 bez regresji.
