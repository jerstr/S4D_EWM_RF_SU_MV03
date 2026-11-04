# Zadanie: backend aplikacji „Przesunięcia” (EWM RF) – wariant A z wieloma pozycjami

## Kontekst

Aplikacja Fiori `ZS4MORIS_EWM_COCKPIT-RF_MOVE` (UI5, repo `S4D_EWM_RF_SU_MV01`) korzysta z serwisu OData V2 `Z075EWM_SR_ODATA01_SRV`. Ty masz dostęp do systemu S4. Ja (druga sesja Claude Code) mam tylko kod UI. Twoja część to backend.

Aplikacja ma dwa przepływy skanowania. **Oba mają zostać.** Wariant rozpoznaje się automatycznie po tym, co zeskanowano w pierwszym polu.

- **Wariant A (bezpośredni).** W pierwszym polu skanuje się od razu kod materiał+partia, np. `20007730000668890`. UI wywołuje `SB_MOVE_set_vlpla` z tym kodem w parametrze `Vlpla`. Backend znajduje miejsce partii, wpisuje je do `Vlpla` w nagłówku i dodaje pozycję. **Problem:** UI blokuje pole, gdy `Vlpla` w nagłówku jest wypełnione, a drugie pole się nie pokazuje (prawdopodobnie przez `SelectionEnabled = true`). Kolejną pozycję można dodać dopiero po Reset.
- **Wariant B (przez miejsce).** Najpierw skanuje się miejsce, np. `N7-R1-031` (`SB_MOVE_set_vlpla`), a potem kolejne kody w drugim polu (`SB_MOVE_set_mat_batch`). Ten wariant działa poprawnie i **nie wolno go zepsuć**.

**Cel:** w wariancie A kolejne skany kodów w pierwszym polu dopisują pozycje bez Reset. Obowiązuje zasada jednego miejsca źródłowego (niżej).

## Tryb pracy

1. **Etap 1 to wyłącznie analiza (tylko odczyt).** Niczego nie zmieniaj, nie aktywuj i nie twórz transportów. Oddaj raport (format na końcu).
2. **Etap 2 to zmiany**, dopiero po akceptacji użytkownika (Jerzy Stryja). Zasada miejsca i pole `ScanMode` są **propozycjami jeszcze niepotwierdzonymi**.
3. Nie zmieniaj obiektów standardu SAP. Pracuj tylko na obiektach Z w transporcie wskazanym przez użytkownika i nie zwalniaj transportów.
4. Nie wykonuj w systemie akcji księgujących (`SB_MOVE_to_nlpla`, tworzenie zadań magazynowych) bez wyraźnej zgody użytkownika.

## Co UI wywołuje (z `webapp/controller/Worklist.controller.js`)

| Function import | Parametry wysyłane przez UI | Kiedy |
|---|---|---|
| `SB_MOVE_init` | – | start; zwraca `Ui5Guid` (sesja może być przywrócona) |
| `SB_MOVE_set_vlpla` | `Ui5Guid`, `Vlpla` (= surowy skan: miejsce **albo** kod mat+partia) | Enter w pierwszym polu |
| `SB_MOVE_set_mat_batch` | `Ui5Guid`, `Vlpla`, `ScanMatBatch`, `mode` (`""` lub `"M"`), `qtyPCE` | Enter w drugim polu (wariant B); `mode="M"` dla „Przen.na M” |
| `SB_MOVE_reset` | `Ui5Guid`, `Vlpla`, `ScanMatBatch` | przycisk Reset |
| `SB_MOVE_set_other_items` | `Ui5Guid`, `Vlpla`, `SelectedItems` (`"Matnr/Charg,..."`) | Um.w mag. |
| `SB_MOVE_to_nlpla` | `Ui5Guid`, `Vlpla`, `Nlpla`, `Approved`, `PrintDoor`, `HuCount` | księgowanie (MS docelowe / AUTOMAT / MOVE_M) |

UI czyta z odpowiedzi `Message` i `MessageType`: `E` oznacza błąd, a niepusty komunikat przy typie innym niż `I` pokazuje się jako MessageBox. Czyta też `SelectionEnabled` i `StorageType`.

**Pola nagłówka `SB_MOVE` używane w UI:** `Ui5Guid`, `Vlpla`, `Nlpla`, `ScanMatBatch`, `Approved`, `SelectionEnabled`, `StorageType`, `ScanCount`, `VlplaT331Huobl`, `PrintDoor`, `MoveMMessage`, `MoveMWeightPce`, `MoveMLenghtPce`.

**Pola pozycji `toSB_MOVE_Items` używane w UI:** `Matnr`, `Charg`, `HuidentSt`, `Vlpla`, `Maktx`, `QuantitySt`, `UnitofmeasureSt`, `PceUmrez`, `PceUmren`, `QtyByUser`, `Marked`, `Status`, `StatusIcon`, `StatusIconColor`, `PackIcon`, `CatSt`, `DestLocDescAddr`, `CutScheme`, `CutCl`, `RangeFlag`.

**Inne zbiory:** nawigacja `toSB_MOVE_Items_OnVlpla` (okno wyboru w Um.w mag.) oraz zbiór encji `SB_MOVE_PrintersSet`.

**Blokady „jednej partii” w UI:** przyciski Um.w Aut. i Przen.na M odmawiają działania przy `ScanCount > 1`. Wariant A musi więc poprawnie zwiększać `ScanCount`.

## Etap 1 – analiza (odpowiedz na każde pytanie, z fragmentami kodu)

1. Znajdź klasy serwisu (`..._MPC_EXT`, `..._DPC_EXT`, projekt SEGW `Z075EWM_SR_ODATA01`) i wszystkie klasy/metody pomocnicze używane przez `SB_MOVE_*`. Podaj nazwy obiektów i metod.
2. **`SB_MOVE_set_vlpla`:**
   - jak rozróżnia miejsce od kodu materiał+partia;
   - co robi w każdym z tych przypadków (nagłówek, pozycje, `ScanCount`, `ScanMatBatch`, `SelectionEnabled`, `StorageType`);
   - co się dzieje, gdy w nagłówku jest już `Vlpla` i przychodzi kolejny skan: czy dopisuje pozycję, nadpisuje sesję czy zwraca błąd.
3. Jak wariant A wybiera miejsce, gdy partia leży na kilku MS?
4. **`SB_MOVE_set_mat_batch` (wariant B):**
   - gdzie są walidacje statusu pozycji (zielony/błąd, `StatusIcon`);
   - gdzie jest przeliczenie JM (`PceUmrez`/`PceUmren`, MG/SZT);
   - gdzie jest blokada duplikatów;
   - co się dzieje, gdy partii nie ma na `Vlpla` z nagłówka (jaki komunikat).
5. Czy wariant A i wariant B dodają pozycje **tą samą** procedurą? Jeśli nie, wypisz różnice.
6. Czy przy błędzie (`MessageType = E`) którakolwiek z tych metod kasuje już dodane pozycje albo czyści nagłówek?
7. Co czyści `SB_MOVE_reset`? Jak `SB_MOVE_init` przywraca sesję i gdzie jest ona trzymana (tabela Z)?
8. Kiedy `SelectionEnabled = true`? Czy tylko dla typów N04/M06, czy też dla wariantu A?
9. Czy `SB_MOVE_set_mat_batch` z `mode="M"` (Przen.na M) działa w wariancie A, czyli czy `ScanMatBatch` w nagłówku jest tam wypełnione?
10. Czy `SB_MOVE_set_other_items` i `SB_MOVE_to_nlpla` obsługują wiele pozycji z sesji? Opisz tylko, bez zmian.

## Etap 2 – proponowane zmiany (dopiero po akceptacji)

**A. Nowe pole nagłówka `ScanMode` (CHAR1)** w encji `SB_MOVE`, uzupełnione w SEGW i MPC, z wartością w tabeli sesji, jeśli sesja jest utrwalana:
- `'B'`: pierwszy skan był miejscem;
- `'M'`: pierwszy skan był kodem materiał+partia;
- puste: brak sesji lub po Reset.

Pole ustawia `SB_MOVE_set_vlpla` przy pierwszym skanie, czyści je `SB_MOVE_reset`, a zwraca każdy odczyt nagłówka. UI użyje go do odblokowania pola w trybie `'M'`.

**B. `SB_MOVE_set_vlpla`, gdy `ScanMode = 'M'` i `Vlpla` nagłówka jest już wypełnione:**
- **Kod materiał+partia:** dodaj pozycję **tą samą procedurą co wariant B** (`set_mat_batch`), z `Vlpla` z nagłówka. Status, JM, duplikaty i `ScanCount` mają działać identycznie jak w B.
- **Partia nie leży na `Vlpla` z nagłówka:** zwróć `MessageType = 'E'` i nie dodawaj pozycji ani nie zmieniaj sesji. Komunikat np.: „Partia &1/&2 nie leży na MS &3. Bieżące przesunięcie dotyczy MS &3 – zakończ je lub użyj Reset.” Jeśli partia leży też na innych MS, a na `Vlpla` nagłówka jest, dodaj ją z `Vlpla` nagłówka.
- **Skan miejsca w trakcie sesji A:** zwróć `MessageType = 'E'` z komunikatem „Zmiana MS w trakcie skanowania partii – użyj Reset.” Nic nie zmieniaj.
- **Błędny kod lub duplikat:** te same komunikaty co w wariancie B, sesja bez zmian.

**C. Bez zmian:**
- pierwszy skan w obu wariantach (poza ustawieniem `ScanMode`);
- `set_mat_batch` w wariancie B;
- `set_other_items` i `to_nlpla`, czyli cała logika księgowania;
- logika `SelectionEnabled`/N04/M06.

Usunięcie wszystkich pozycji przyciskiem „X” nie zwalnia miejsca. Zwalnia je tylko Reset.

## Testy backendu (etap 2; przez SEGW/`/IWFND/GW_CLIENT` lub UI, bez księgowania)

- **A, jedna partia:** `ScanMode = 'M'`, `Vlpla` = MS partii, 1 pozycja, `ScanCount = 1`.
- **A, druga i kolejne partie z tego samego MS:** pozycje dopisane, `ScanCount` rośnie, statusy i JM jak w B.
- **A, partia z innego MS:** `E` z czytelnym komunikatem, pozycje bez zmian.
- **A, skan miejsca w trakcie sesji:** `E`, sesja bez zmian.
- **A i B, duplikat oraz błędny kod:** `E`, pozycje bez zmian.
- **Reset:** `ScanMode`, `Vlpla` i pozycje wyczyszczone; nowy pierwszy skan wybiera wariant od nowa.
- **Regresja wariantu B:** miejsce, potem kilka kodów → zachowanie identyczne jak przed zmianą, `ScanMode = 'B'`.
- **`SB_MOVE_init` przy otwartej sesji A:** zwraca `ScanMode = 'M'`.

## Format raportu (dla drugiej sesji Claude Code i użytkownika)

1. Lista obiektów (klasy, metody, tabele) z krótkim opisem.
2. Odpowiedzi na pytania 1–10 z etapu 1, każda z fragmentem kodu i nazwą metody (+ numer linii).
3. Potwierdzenie albo korekta przyczyny blokady w wariancie A po stronie backendu.
4. Ryzyka i rozbieżności względem propozycji z etapu 2, np. inna procedura dodawania w A niż w B albo czyszczenie pozycji przy `E`.
5. Po etapie 2:
   - lista zmienionych obiektów i numer transportu;
   - dokładna nazwa i typ nowego pola oraz fragment `$metadata` z `SB_MOVE` (UI musi go odwzorować w `localService/metadata.xml`);
   - wyniki testów.
