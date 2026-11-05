# MV03 „Uporządkuj” – etap 2: porządkowanie MS z RF Przyjęcia

Stan na 05.11.2026. S4D, klient 100. Backend MV03 w transporcie **S4DK929808**, zmiany RF Przyjęcia (GR01) w **S4DK929802**.

## Proces

1. **RF Przyjęcia (GR01)**, okno „Wybór materiału do rozmieszczenia”: magazynier wybiera wiersz poziomu **TIDY** („Uporządkuj: wyjąć …”). GR01 nie tworzy zadania, tylko przechodzi do MV03 adresem `#ZS4MORIS_EWM_COCKPIT-RF_MOVE03` z parametrami `TorId`, `Productno`, `Vlpla` (MS do uporządkowania) i `TidyPlan` (`MATNR:MS;MATNR:MS` – plan strategii).
2. **MV03** przy starcie z parametrami woła `SB_MOVE_tidy_init`: plan trafia do tabeli `ZS4M_EWM_MV03_T`, sesja przesunięć jest czyszczona, MS źródłowe = porządkowane MS. Na górze ekranu panel **„Do zrobienia”**: indeks, opis, ile zostało na MS (ilość, liczba partii), MS docelowe z planu, status (do zrobienia / w trakcie / gotowe, kłódka = zapas zablokowany lub z otwartym zadaniem).
3. **Jedno pole skanowania** („Skanuj partię z MS lub MS docelowe”):
   - kod partii/paczki → pozycja z porządkowanego MS (tylko zapas z tego MS), nagłówek pokazuje MS docelowe wg planu;
   - MS docelowe → zadanie magazynowe dla zeskanowanych pozycji (`SB_MOVE_to_nlpla`);
   - porządkowane MS → tylko potwierdzenie, nic się nie dzieje.
4. Kolejność indeksów dowolna, ale **jeden indeks na cykl**: skan partii innego indeksu przed potwierdzeniem MS = komunikat „Najpierw potwierdź MS docelowe dla …”.
5. **MS inne niż w planie**: backend zwraca `MessageType = W`, UI pyta „Przesunąć? Kierownik dostanie e-mail”. Po OK wywołanie `SB_MOVE_to_nlpla` z `TidyForce = X`; faktyczne MS zapisane w planie, mail na listę `ZS4M_EWM_STR_RF_DLIST` (Z075EWM_CFG).
6. Gdy na MS nie ma już zapasu indeksów z planu: plan zamknięty (status C), komunikat „Uporządkowano MS … Powrót do RF Przyjęcia” i **automatyczny powrót** do GR01 (`backToPreviousApp`, GR01 wraca na ten sam transport). Okno rozmieszczenia liczy się od nowa, MS wychodzi jako „ten sam indeks”/„puste”. Zadanie magazynowe z natychmiastowym potwierdzeniem księguje zapas dopiero przy `COMMIT WORK`, dlatego `tidy_after_move` najpierw zatwierdza LUW (`COMMIT WORK AND WAIT` + `/scwm/cl_tm=>cleanup`), a dopiero potem liczy, co zostało na MS (poprawka po teście na skanerze 05.11.2026 – bez niej plan nigdy się nie domykał). Dodatkowo każda akcja (`execute`) domyka plan przez `tidy_close`, gdy na MS nie ma już nic z planu (np. zapas przesunięty poza MV03 albo plan otwarty przed poprawką); UI obsługuje `TidyFinished` także w odpowiedzi na `SB_MOVE_tidy_init`.
7. **Przerwij** (przycisk w panelu): potwierdzenie, `SB_MOVE_tidy_cancel` → plan status X, mail do kierownika, powrót do GR01.
8. Plan starszy niż 4 h jest ignorowany (status T). Ponowne wejście z GR01 na to samo MS i auto zastępuje plan bez maila; inne MS/auto = stary plan porzucony z mailem.

Wyłączone w trybie porządkowania: `AUTOMAT` (Um.w Aut.), `MOVE_M` (Przen.na M), `TABLE`, ilości częściowe (przenosimy całość). Przyciski są ukryte w UI, backend też je odrzuca.

## Usługa OData `ZUI_S4M_EWM_MV03_O2` – co doszło

| Element | Opis |
|---|---|
| `SB_MOVE_tidy_init` (POST) | `Ui5Guid`, `TorId`, `Productno`, `Vlpla`, `TidyPlan` → nagłówek z `TidyActive`, komunikat I |
| `SB_MOVE_tidy_cancel` (POST) | `Ui5Guid`, `Vlpla`, `ScanMatBatch` (puste) → plan X, mail, komunikat I |
| `SB_MOVE_to_nlpla` | nowy parametr `TidyForce` (`X` = MS inne niż plan potwierdzone) |
| `SB_MOVESet` – nowe pola | `TidyActive`, `TidyTaskId`, `TidyTorId`, `TidyProductno`, `TidyMatnr` (bieżący indeks), `TidyTarget` (MS docelowe bieżącego indeksu), `TidyOpen`, `TidyDone`, `TidyFinished`, `TidyText` |
| `SB_MOVE_TidySet`, nawigacja `to_SB_MOVE_Tidy` | lista „Do zrobienia”: `TaskId`, `Matnr`, `Maktx`, `Matkl`, `Vlpla`, `TargetLgpla`, `ActualLgpla`, `QtyInit`, `QtyRemaining`, `Uom`, `BatchesRemaining`, `BlockedText`, `Status` (O/P/D), `StatusText`, `StatusIcon`, `StatusIconColor`, `IsCurrent` |

Komunikaty: `MessageType` `E` = błąd, `W` = pytanie (MS inne niż plan), `I` = postęp lub koniec (`TidyFinished = true`).

## Obiekty backendu (pakiet ZS4M_EWM_MV03)

- tabela `ZS4M_EWM_MV03_T` (plan: `task_id` + `matnr`, `tor_id`, `productno`, `vlpla`, `target_lgpla`, `actual_lgpla`, `qty_init`, `status` O/C/X/T);
- struktura `ZS4M_EWM_MV03_S_HDR` = `Z075EWM_SR_ODATA_SB_MOVE` + pola `tidy_*` (struktura MV01 bez zmian);
- `ZCL_S4M_EWM_MV03_MOVE`: metody `get_tidy_task`, `get_tidy_items`, `tidy_parse_plan`, `tidy_fill_header`, `tidy_after_move`, `tidy_close`, `tidy_mail`, akcje `act_sb_move_tidy_init/_cancel`; gałęzie trybu porządkowania w `set_vlpla`, `set_mat_batch`, `to_nlpla`, `init`, `execute`;
- CDS `ZR_S4M_EWM_MV03T`, encja abstrakcyjna `ZA_S4M_EWM_MV03_TIDY`, pola w `ZR_S4M_EWM_MV03H`, BDEF, `ZBP_R_S4M_EWM_MV03H` (`lhc_sb_move_tidy`), `ZCL_S4M_EWM_MV03_QUERY` (`map_tidy`), SRVD, SRVB opublikowany ponownie.

RF Przyjęcia (pakiet Z075EWM_SR_UI, S4DK929802): pola `Level` i `TidyPlan` w `Z075EWM_SR_ODATA_PUTAWAY` + `MPC_EXT->DEFINE`, wypełniane w `DPC_EXT->PUTAWAY_NEW_STRATEGY`. Po imporcie/aktywacji odświeżyć cache metadanych usługi `Z075EWM_SR_ODATA01_SRV` (`/IWFND/CACHE_CLEANUP`), inaczej UI nie zobaczy nowych pól.

## Testy

- ABAP Unit `ZBP_R_S4M_EWM_MV03H`: 13/13 OK (S4D, 05.11.2026), w tym `LTC_TIDY` (plan i lista, reguły skanowania, MS docelowe, Reset/Init z planem). Klasy DANGEROUS – uruchamiać świadomie, piszą w tabelach sesji i planu użytkownika testu.
- Gateway Client grupa `ZS4M_MV03`: przypadki 16–22 (porządkowanie). Odtworzyć grupę: `ZCL_S4M_EWM_MV03_GWC` F9 w ADT. **Przypadek 22 (przerwanie) wysyła mail** na listę `ZS4M_EWM_STR_RF_DLIST`.
- Test na skanerze 05.11.2026 (MS N9-R1-035, 2 indeksy): przejście z GR01, skany i oba przesunięcia OK; koniec planu nie był zgłaszany – poprawione (patrz Proces pkt 6), po poprawce LTC_READ + LTC_TIDY 7/7 OK.
- Nietestowane automatycznie (księgują): zamknięcie planu po ostatnim przesunięciu (do powtórzenia na skanerze po deployu), mail przy MS innym niż plan, powrót do GR01.

## UI (ten projekt)

- `Worklist.view.xml`: panel porządkowania (`TidyActive`), jedno pole skanowania, ukryte Um.w mag./Um.w Aut./Przen.na M i pole „Docelowe MS” w trybie porządkowania, przycisk „Przerwij”.
- `Worklist.controller.js`: `_getTidyStartupParams`, `_startTidy`, `_onTidyResponse` (E/W/I, `TidyFinished`), `_tidyForceMove`, `onTidyCancel`, `_backToReceipt`; `onVlpla` i `onUpdateFinished` z gałęzią trybu porządkowania.
- `localService/metadata.xml` nie odświeżony (potrzebny dostęp HTTP do S4D) – pobrać z `$metadata` usługi przy najbliższej pracy w BAS.
- Launchpad: intent `ZS4MORIS_EWM_COCKPIT-RF_MOVE03` istnieje; w target mapping muszą być dozwolone dodatkowe parametry (`TorId`, `Productno`, `Vlpla`, `TidyPlan`).

## Otwarte

- Obiekt autoryzacji dla MV03 (jak MV01 – brak; do uzgodnienia).
- Test księgowania i powrotu na skanerze.
- Review przed zwolnieniem (osobna sesja, skill `moris-fiori-s4-review`).
