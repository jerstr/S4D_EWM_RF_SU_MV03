# MV03 „Uporządkuj” – przepięcie UI na nową usługę RAP

Stan na 05.11.2026. Backend gotowy i przetestowany w S4D (klient 100), transport **S4DK929808**.
Usługa odwzorowuje kontrakt `SB_MOVE*` z `Z075EWM_SR_ODATA01_SRV` (MV01). MV01 i stara usługa są bez zmian.

## Adres usługi

```
/sap/opu/odata/sap/ZUI_S4M_EWM_MV03_O2/
```

OData V2, wersja 0001, opublikowana. Metadane: `/sap/opu/odata/sap/ZUI_S4M_EWM_MV03_O2/$metadata`.

## Co zmienić w UI (MV03, kopia MV01)

| Miejsce | Było (MV01) | Jest (MV03) |
|---|---|---|
| `manifest.json` → `dataSources.mainService.uri` | `/sap/opu/odata/sap/Z075EWM_SR_ODATA01_SRV/` | `/sap/opu/odata/sap/ZUI_S4M_EWM_MV03_O2/` |
| `localService/mainService/metadata.xml` | stara usługa | pobrać nowe `$metadata` z adresu wyżej |
| Nawigacja pozycji (`items="{toSB_MOVE_Items}"`) | `toSB_MOVE_Items` | `to_SB_MOVE_Items` |
| Nawigacja okna wyboru | `toSB_MOVE_Items_OnVlpla` | `to_SB_MOVE_Items_OnVlpla` |
| Parametr `SB_MOVE_set_mat_batch` | `mode` | `MoveMode` (`mode` to słowo zastrzeżone CDS) |

Bez zmian, nazwy identyczne jak w MV01:
- zbiory `SB_MOVESet`, `SB_MOVE_ItemsSet`, `SB_MOVE_Items_OnVlplaSet`, `SB_MOVE_PrintersSet`;
- function importy `SB_MOVE_init`, `SB_MOVE_set_vlpla`, `SB_MOVE_set_mat_batch`, `SB_MOVE_set_other_items`, `SB_MOVE_to_nlpla`, `SB_MOVE_reset`, wywoływane przez `POST`;
- parametry `Ui5Guid`, `Vlpla`, `ScanMatBatch`, `qtyPCE`, `SelectedItems`, `Nlpla`, `Approved`, `PrintDoor`, `HuCount`;
- pola encji (`Message`, `MessageType`, `SelectionEnabled`, `ScanCount`, `Approved`, `StorageType`, `VlplaT331Huobl`, `PrintDoor`, `MoveM*`, a w pozycjach `Guid`, `Matnr`, `Charg`, `HuidentSt`, `QtyByUser`, `Marked`, `Status`, `StatusIcon`, `StatusIconColor`, `CatSt`, `PackIcon`, `PceUmrez`, `PceUmren`, `RangeFlag`, `DestLocDescAddr`, `CutScheme`, `CutCl`, `QuantitySt`, `UnitofmeasureSt`, `Maktx`, `Vlpla`);
- typy: `Guid` = Edm.Guid (ścieżka `SB_MOVE_ItemsSet(guid'…')`), `Marked`/`SelectionEnabled`/`RangeFlag` = Edm.Boolean, `QtyByUser` = String(10), `ScanCount` = Int32;
- konwersje wyjścia jak w SEGW: materiał bez zer wiodących (MATN1), HU w formacie zewnętrznym, JM przez CUNIT.

Konwencja odpowiedzi bez zmian: function import zwraca encję `SB_MOVE` z `Message` i `MessageType`.
W odpowiedzi jest dodatkowe pole techniczne `Update_mc` (RAP), UI może je pominąć.

## Zachowanie usługi (jak MV01)

- Sesja MV03 jest osobna: tabele `ZS4M_EWM_MV03_H` (MS źródłowe użytkownika) i `ZS4M_EWM_MV03_I` (pozycje). MV01 i MV03 nie dzielą sesji.
- `SB_MOVE_init` odtwarza sesję młodszą niż 60 minut, starszą kasuje.
- `MERGE SB_MOVE_ItemsSet(guid'…')` zapisuje tylko `Marked` i `QtyByUser`. Ilość większa niż zapas nie jest zapisywana.
- `DELETE SB_MOVE_ItemsSet(guid'…')` usuwa pozycję.
- Ustawienia bram i naw (domyślna `PrintDoor`) są czytane ze wspólnej tabeli użytkownika `Z075EWM_ODATA_US`, tylko do odczytu.

## Testy wykonane w S4D (HTTP OData V2, bez księgowania)

Wszystkie przeszły (ABAP Unit w `ZBP_R_S4M_EWM_MV03H`, 9 testów):
- `$metadata` zawiera wszystkie zbiory, nawigacje, function importy i parametry z tabeli wyżej;
- wariant B: skan MS `N9-R2-001`, potem kod `20090590000674668` → 1 pozycja, `ScanCount` = 1, status zielony; okno wyboru pokazuje pozostałe partie MS;
- MERGE `Marked` + `QtyByUser` = 2 → zapisane (`2.000`); `QtyByUser` = 999 → bez zapisu;
- DELETE pozycji → lista pusta;
- wariant A: kod w pierwszym polu → backend ustala MS, `SelectionEnabled` = true, 1 pozycja;
- błędne MS → `MessageType` = E z komunikatem;
- Reset czyści sesję; drukarki zwracają bramy `B…`.

Nie testowane automatycznie, bo księgują w EWM: `SB_MOVE_to_nlpla` (MS docelowe, `AUTOMAT`, `MOVE_M`), przesunięcie ze stołu (`TABLE`). Do sprawdzenia w UI na S4D.

## Wykonane w UI (05.11.2026)

- `manifest.json`: `mainService.uri` = `/sap/opu/odata/sap/ZUI_S4M_EWM_MV03_O2/`. Lokalna ścieżka mocka została bez zmian: `localService/metadata.xml`.
- `webapp/localService/metadata.xml`: nowe `$metadata` pobrane z S4D/100 przez destination `S4D_100`. Zgodność z UI sprawdzona: wszystkie zbiory, nawigacje, function importy, parametry i 35 pól używanych w UI są obecne.
- Nawigacje `to_SB_MOVE_Items` (`Worklist.view.xml`) i `to_SB_MOVE_Items_OnVlpla` (`MoveDialog.fragment.xml`).
- Parametr `MoveMode` w 3 wywołaniach `SB_MOVE_set_mat_batch` (`onScanMatBatch`, `_addMatBatchOnVlpla`, `callSet_mat_batch`).
- `ui5-deploy.yaml`: destination `S4D_100`, klient `100`, transport `S4DK929808`. Destination `S4D_010` z MV01 zwraca w BAS 401.
