sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/HBox",
	"sap/m/Text",    
    "sap/m/List",
    "sap/m/StandardListItem"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, 
       MessageBox, MessageToast, Fragment, Dialog, Label, Input, Button, ButtonType, HBox, Text,
       List, StandardListItem) {
    "use strict";

    var oSourceG = "";
    var idVlpla;
    var idNlpla;
    var thisView;
    var that;
    var gViewModel;
    var gLblCnt;
    var gDialog;
    var idPrinter;
    var idLblCnt;
    var gPrinterDialog;
    var gPrinter;
    var gStorageType;
    var GMoveToMMessage;
    var gData;
    var gQtyErrorPaths = {};


    return BaseController.extend("ewm.s4m.S4D_EWM_RF_SB_MOVE03.S4D_EWM_RF_SU_MV03.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
        onInit: function () {
            var iOriginalBusyDelay,
                oTable = this.byId("table");

            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                lineExist: false,
                DialogMoveMMessage: "",
                DialogMoveMWeightPce: "",
                DialogMoveMLenghtPce: ""
                //lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
            });

            idPrinter = "";
            idLblCnt = "";


            // Put down worklist table's original value for busy indicator delay,
            // so it can be restored later on. Busy handling on the table is
            // taken care of by the table itself.
            iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
                shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
                tableBusyDelay: 0,
                sourceInput: "",
                // "B" - first scan was a storage bin, "M" - first scan was a material/batch code
                scanMode: "",
                selectionEnabled: false,
                hasClientColumn: false,
                hasSchemeColumn: false,
                hasHuItems: false,
                hasQtyError: false
            });
            this.setModel(oViewModel, "worklistView");
            oViewModel.setProperty("/busy", true);

            // Make sure, busy indication is showing immediately so there is no
            // break after the busy indication for loading the view's meta data is
            // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
            oTable.attachEventOnce("updateFinished", function () {
                // Restore original busy indicator delay for worklist's table
                oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
            });
            // Add the worklist page to the flp routing history
            this.addHistoryEntry({
                title: this.getResourceBundle().getText("worklistViewTitle"),
                icon: "sap-icon://table-view",
                intent: "#Uporzadkuj-display"
            }, true);

            this.getRouter().getRoute("worklist").attachPatternMatched(this._onWorklistMatched, this);
            idNlpla = this.getView().byId("idNlpla");
            idVlpla = this.getView().byId("idVlpla");

            gPrinter = "";
            gLblCnt = "";

        },
        onTableDelete: function (oEvent) {
            thisView = this;
            oSourceG = oEvent.getSource();
            var oList = oEvent.getSource(),
                oItem = oEvent.getParameter("listItem"),
                sPath = oItem.getBindingContext().getPath();

            // after deletion put the focus back to the list
            //oList.attachEventOnce("updateFinished", oList.focus, oList);

            // send a delete request to the odata service
            // this.getModel().remove(sPath);
			this.getModel().remove(sPath, {
				success: function (oData, response) {
					oSourceG.getModel().refresh(); 
				}
			});            
            //oSourceG.getModel().submitChanges();
            //this.getModel().refresh();		

            if (!thisView.byId("idVlpla").getValue()) {
                thisView.byId("idVlpla").focus();
            } else {
                if (thisView.byId("idApproved").getText()) {
                    thisView.byId("idNlpla").focus();
                } else {
                    thisView.byId("idVlpla").focus();
                }
            }

        },
        handleSwipe: function (oEvent) {   // register swipe event
            // var oSwipeContent = oEvent.getParameter("swipeContent"), // get swiped content from event
            // 	oSwipeDirection = oEvent.getParameter("swipeDirection"); // get swiped direction from event

            var oList = oEvent.getSource(),
                oItem = oEvent.getParameter("listItem"),
                sPath = oItem.getBindingContext().getPath();
            //oSwipeDirection === "BeginToEnd"
            // after deletion put the focus back to the list
            oList.attachEventOnce("updateFinished", oList.focus, oList);

            // send a delete request to the odata service
            this.getModel().remove(sPath);

        },
        _createUUID: function () {
            var dt = new Date().getTime();
            var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                var r = (dt + Math.random() * 16) % 16 | 0;
                dt = Math.floor(dt / 16);
                return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        },
        OnReset: function (oEvent) {
            oSourceG = oEvent.getSource();
            idVlpla = this.getView().byId("idVlpla");
            var oViewModel = this.getModel("worklistView");
            oViewModel.setProperty("/selectionEnabled", false);
            oViewModel.setProperty("/sourceInput", "");
            oViewModel.setProperty("/scanMode", "");
            //var idScanMatBatch = this.getView().byId("idScanMatBatch");
            // idVlpla.setValue("");
            // idScanMatBatch.setValue("");
            //oSourceG.getModel().submitChanges();
            //oSourceG.getModel().refresh();
            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_reset", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: data.Ui5Guid,
                    Vlpla: data.Vlpla,
                    ScanMatBatch: data.ScanMatBatch
                },
                success: function (oData, response) {

                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message);
                        }
                    }
                    if (oData.MessageType === "E") {
                        //idScanMatBatch.setValue("");
                    } else {
                        //oSourceG.getModel().resetChanges();
                        //oSourceG.getModel().refresh();
                    }
                    oSourceG.getModel().refresh();
					oViewModel.setProperty("/sourceInput", "");
                },
                error: function (oError) {
                    //oSourceG.getModel().resetChanges();
                    oSourceG.getModel().refresh();
                }
            });

        },
        onCheckBoxSelected: function (oEvent) {
            oSourceG = oEvent.getSource();
            oSourceG.getModel().submitChanges();
        },
        onQtyliveChange: function (oEvent) {
            oSourceG = oEvent.getSource();
            var oContext = oSourceG.getBindingContext(),
                oData = oContext.getObject(),
                sPath = oContext.getPath(),
                fUmrez = parseFloat(oData.PceUmrez),
                fUmren = parseFloat(oData.PceUmren),
                fQty = parseFloat(oData.QtyByUser),
                fStockQty = parseFloat(oData.QuantitySt),
                bIsMeters = (oData.UnitofmeasureSt || "").trim().toUpperCase() === "M",
                sError = "";

            // quantity can't exceed the stock - the backend would silently restore the full stock quantity
            if (!isNaN(fQty) && fStockQty > 0 && fQty > fStockQty) {
                sError = "Ilość nie może przekroczyć zapasu (" + oData.QuantitySt + " " + oData.UnitofmeasureSt + ").";
            // material in meters, not a range material - quantity must convert to full SZT pieces
            } else if (!oData.RangeFlag && bIsMeters && !isNaN(fQty) && fUmrez > 0 && fUmren > 0) {
                var fPieces = fQty * fUmren / fUmrez;
                if (Math.abs(fPieces - Math.round(fPieces)) > 0.001) {
                    sError = "Ilość musi przeliczać się do pełnych sztuk.";
                }
            }
            if (sError) {
                oSourceG.setValueState("Error");
                oSourceG.setValueStateText(sError);
                gQtyErrorPaths[sPath] = true;
                this.getModel("worklistView").setProperty("/hasQtyError", true);
                return;
            }
            oSourceG.setValueState("None");
            delete gQtyErrorPaths[sPath];
            this.getModel("worklistView").setProperty("/hasQtyError", Object.keys(gQtyErrorPaths).length > 0);
            oSourceG.getModel().submitChanges();
        },
        onVlpla: function (oEvent) {
            oSourceG = oEvent.getSource();
            thisView = this;
            gStorageType = "";
            //oSourceG.getModel().submitChanges();
            idVlpla = this.getView().byId("idVlpla");
            var idScanMatBatch = this.getView().byId("idScanMatBatch");
            var context = oSourceG.getBindingContext();
            if (!context) {
                MessageBox.error('Proszę ponownie uruchomić aplikację.');
            }
            var test = idVlpla.getValue().trim().length;
            if (!test) {
                this.getModel("worklistView").setProperty("/sourceInput", "");
                return;
            }
            var sSourceInput = idVlpla.getValue();
            var data = context.getProperty(null, context);
            if (!data) {
                MessageBox.error('Proszę ponownie uruchomić aplikację.');
            }
            // variant A: next material/batch codes are added to the bin set by the first scan
            if (data && data.Vlpla && this.getModel("worklistView").getProperty("/scanMode") === "M") {
                this._addMatBatchOnVlpla(data, sSourceInput);
                return;
            }
            this.byId("table").addEventDelegate({
                "onAfterRendering": function () {
                    if (!thisView.byId("idVlpla").getValue()) {
                        thisView.byId("idVlpla").focus();
                    } else {
                        if (thisView.byId("idApproved").getText()) {
                            thisView.byId("idNlpla").focus();
                        } else if (thisView.byId("idScanMatBatch").getVisible() && thisView.byId("idScanMatBatch").getEnabled()) {
                            thisView.byId("idScanMatBatch").focus();
                        } else {
                            thisView.byId("idVlpla").focus();
                        }
                    }
                },
                "applyFocusInfo": function () {
                    if (!thisView.byId("idVlpla").getValue()) {
                        thisView.byId("idVlpla").focus();
                    } else {
                        if (thisView.byId("idApproved").getText()) {
                            thisView.byId("idNlpla").focus();
                        } else if (thisView.byId("idScanMatBatch").getVisible() && thisView.byId("idScanMatBatch").getEnabled()) {
                            thisView.byId("idScanMatBatch").focus();
                        } else {
                            thisView.byId("idVlpla").focus();
                        }
                    }
                }
            }, this);
            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_set_vlpla", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: data.Ui5Guid,
                    Vlpla: sSourceInput
                },
                success: function (oData, response) {
                    gStorageType = oData.StorageType;
                    // tidy mode (plan from RF Przyjęcia): one scan field - batch code or target bin
                    if (oData.TidyActive) {
                        thisView._onTidyResponse(oData, sSourceInput);
                        return;
                    }
					thisView.getModel("worklistView").setProperty("/selectionEnabled", oData.SelectionEnabled === true);
					// the backend returns the bin found for the scan - a different value means a material/batch code was scanned
					var bMatBatchScan = oData.MessageType !== "E" && !!oData.Vlpla &&
						thisView._normalizeScan(oData.Vlpla) !== thisView._normalizeScan(sSourceInput);
					thisView.getModel("worklistView").setProperty("/scanMode", oData.MessageType === "E" ? "" : (bMatBatchScan ? "M" : "B"));
					if (bMatBatchScan) {
						thisView.getModel("worklistView").setProperty("/sourceInput", "");
					}
                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message, {
                                //icon: MessageBox.Icon.INFORMATION,
                                title: "Błąd weryfikacji MS",
                                onClose: function (oAction) {
                                    idVlpla.setEnabled(true);
                                    idVlpla.focus();
                                }
                            });
                        }
                    }
                    if (oData.MessageType === "E") {
						thisView.getModel("worklistView").setProperty("/sourceInput", "");
						oSourceG.getModel().resetChanges();
						oSourceG.getModel().refresh();
						idVlpla.setEnabled(true);
						if (!oData.Message) {
							idVlpla.focus();
						}
                    } else {
                        oSourceG.getModel().submitChanges();
                        oSourceG.getModel().refresh();
                        if (idScanMatBatch.getVisible() && idScanMatBatch.getEnabled() && idVlpla.getValue()) {
                            idScanMatBatch.focus();
                        } else {
                            idVlpla.focus();
                        }
                    }
                },
                error: function (oError) {
                    oSourceG.getModel().resetChanges();
                }
            });
        },
        onNlpla: function (oEvent, iData) {
            oSourceG = oEvent.getSource();
            //oSourceG.getModel().submitChanges();

            if (!iData) {
                var context = oSourceG.getBindingContext();
                var data = context.getProperty(null, context);
                var oViewModel = this.getModel("worklistView");
                oViewModel.setProperty("/busy", true);
            } else {
                data = iData;
            }

            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_to_nlpla", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: data.Ui5Guid,
                    Vlpla: data.Vlpla,
                    Nlpla: data.Nlpla,
                    Approved: data.Approved,
                    PrintDoor: gPrinter,
                    HuCount: gLblCnt
                },
                success: function (oData, response) {
                    oViewModel.setProperty("/busy", false);
                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message, {
                                //icon: MessageBox.Icon.INFORMATION,
                                title: "Błąd przetwarzania docelowego MS",
                                onClose: function (oAction) { idNlpla.focus(); }
                            });
                        }
                    }
                    if (oData.MessageType === "E") {
                        idNlpla.setValue("");
                    } else {
                        oViewModel.setProperty("/sourceInput", "");
                        idVlpla.focus();
                        oSourceG.getModel().submitChanges();
                        oSourceG.getModel().refresh();
                    }
                },
                error: function (oError) {
                    oViewModel.setProperty("/busy", false);
                    oSourceG.getModel().resetChanges();
                }
            });
        },
        onScanMatBatch: function (oEvent) {
            oSourceG = oEvent.getSource();
            var idScanMatBatch = this.getView().byId("idScanMatBatch");
            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_set_mat_batch", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: data.Ui5Guid,
                    Vlpla: data.Vlpla,
                    ScanMatBatch: data.ScanMatBatch,
                    MoveMode: "",
                    qtyPCE: ""
                },
                success: function (oData, response) {

                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message);
                        }
                    }
                    if (oData.MessageType === "E") {
                        idScanMatBatch.setValue("");
                    } else {
                        //oSourceG.getModel().resetChanges();
                        oSourceG.getModel().submitChanges();
                        oSourceG.getModel().refresh();
                    }
                },
                error: function (oError) {
                    oSourceG.getModel().resetChanges();
                }
            });
        },
        _normalizeScan: function (sValue) {
            // bin barcodes may come without separators, e.g. N7R1031 for N7-R1-031
            return (sValue || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        },
        _addMatBatchOnVlpla: function (data, sScan) {
            var oViewModel = this.getModel("worklistView");
            idVlpla = this.getView().byId("idVlpla");
            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_set_mat_batch", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: data.Ui5Guid,
                    Vlpla: data.Vlpla,
                    ScanMatBatch: sScan,
                    MoveMode: "",
                    qtyPCE: ""
                },
                success: function (oData, response) {
                    oViewModel.setProperty("/sourceInput", "");
                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message, {
                                title: "Błąd skanowania partii",
                                onClose: function (oAction) { idVlpla.focus(); }
                            });
                        }
                    }
                    if (oData.MessageType !== "E") {
                        oSourceG.getModel().submitChanges();
                        oSourceG.getModel().refresh();
                    }
                    idVlpla.focus();
                },
                error: function (oError) {
                    oViewModel.setProperty("/sourceInput", "");
                    oSourceG.getModel().resetChanges();
                }
            });
        },
        _onWorklistMatched: function (oEvent) {
            thisView = this;
            this.getModel().metadataLoaded().then(function () {
                var oHandle = this.getModel().callFunction("/SB_MOVE_init", {
                    method: "POST",
                    success: function (oData, response) {
                        var Ui5Guid = "";
                        if (oData.Ui5Guid) {
                            Ui5Guid = oData.Ui5Guid;
                        } else {
                            Ui5Guid = thisView._createUUID();
                        }
                        // started from RF Przyjęcia with a tidy plan: register the plan before binding the view
                        var oTidy = thisView._getTidyStartupParams();
                        if (oTidy && !thisView._bTidyStarted) {
                            thisView._bTidyStarted = true;
                            thisView._startTidy(Ui5Guid, oTidy);
                            return;
                        }
                        var sObjectPath = thisView.getModel().createKey("SB_MOVESet", {
                            Ui5Guid: Ui5Guid
                        });
                        thisView._bindView("/" + sObjectPath);
                        idNlpla = thisView.getView().byId("idNlpla");
                        if (oData.TidyActive) {
                            thisView.getView().byId("idVlpla").focus();
                        } else {
                            idNlpla.focus();
                        }
                        thisView.getModel().refresh();
                    },
                    error: function (oError) {
                    }
                });
            }.bind(this));
        },
		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
        /* =========================================================== */
        /* tidy mode - plan from RF Przyjęcia (GR01), stage 2          */
        /* =========================================================== */

        _getTidyStartupParams: function () {
            // GR01 navigates here with TorId, Productno, Vlpla (bin to tidy) and TidyPlan (MATNR:BIN;...)
            var oComponentData = this.getOwnerComponent().getComponentData(),
                oParams = oComponentData && oComponentData.startupParameters;
            if (!oParams || !oParams.Vlpla || !oParams.TidyPlan) {
                return null;
            }
            var fnFirst = function (vValue) {
                return Array.isArray(vValue) ? vValue[0] : vValue;
            };
            return {
                TorId: fnFirst(oParams.TorId) || "",
                Productno: fnFirst(oParams.Productno) || "",
                Vlpla: fnFirst(oParams.Vlpla) || "",
                TidyPlan: fnFirst(oParams.TidyPlan) || ""
            };
        },
        _startTidy: function (sUi5Guid, oTidy) {
            var oViewModel = this.getModel("worklistView"),
                sObjectPath = this.getModel().createKey("SB_MOVESet", { Ui5Guid: sUi5Guid });
            oViewModel.setProperty("/busy", true);
            this.getModel().callFunction("/SB_MOVE_tidy_init", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: sUi5Guid,
                    TorId: oTidy.TorId,
                    Productno: oTidy.Productno,
                    Vlpla: oTidy.Vlpla,
                    TidyPlan: oTidy.TidyPlan
                },
                success: function (oData) {
                    oViewModel.setProperty("/busy", false);
                    thisView._bindView("/" + sObjectPath);
                    if (oData.MessageType === "E") {
                        MessageBox.error(oData.Message, { title: "Porządkowanie MS" });
                    } else if (oData.Message) {
                        MessageToast.show(oData.Message);
                    }
                    thisView.getModel().refresh();
                    thisView.getView().byId("idVlpla").focus();
                },
                error: function () {
                    oViewModel.setProperty("/busy", false);
                    thisView._bindView("/" + sObjectPath);
                    thisView.getModel().refresh();
                }
            });
        },
        _onTidyResponse: function (oData, sScan) {
            // backend answer in tidy mode: E = error, W = target bin differs from the plan (ask), I = progress / finished
            var oViewModel = this.getModel("worklistView");
            oViewModel.setProperty("/sourceInput", "");
            oViewModel.setProperty("/scanMode", "");
            if (oData.MessageType === "E") {
                MessageBox.error(oData.Message, {
                    title: "Porządkowanie MS",
                    onClose: function () {
                        idVlpla.focus();
                    }
                });
                oSourceG.getModel().refresh();
                return;
            }
            if (oData.MessageType === "W") {
                MessageBox.confirm(oData.Message, {
                    title: "MS inne niż w planie",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            thisView._tidyForceMove(oData, sScan);
                        } else {
                            idVlpla.focus();
                        }
                    }
                });
                return;
            }
            if (oData.TidyFinished) {
                MessageBox.success(oData.Message || "Uporządkowano MS " + oData.Vlpla, {
                    title: "Porządkowanie zakończone",
                    onClose: function () {
                        thisView._backToReceipt();
                    }
                });
                return;
            }
            if (oData.Message) {
                MessageToast.show(oData.Message);
            }
            oSourceG.getModel().refresh();
            idVlpla.focus();
        },
        _tidyForceMove: function (oData, sScan) {
            // user confirmed a target bin other than the plan - the backend informs the manager by e-mail
            var oViewModel = this.getModel("worklistView");
            oViewModel.setProperty("/busy", true);
            oSourceG.getModel().callFunction("/SB_MOVE_to_nlpla", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: oData.Ui5Guid,
                    Vlpla: oData.Vlpla,
                    Nlpla: sScan,
                    Approved: "",
                    PrintDoor: "",
                    HuCount: "",
                    TidyForce: "X"
                },
                success: function (oResult) {
                    oViewModel.setProperty("/busy", false);
                    thisView._onTidyResponse(oResult, sScan);
                },
                error: function () {
                    oViewModel.setProperty("/busy", false);
                    oSourceG.getModel().resetChanges();
                    idVlpla.focus();
                }
            });
        },
        onTidyCancel: function (oEvent) {
            oSourceG = oEvent.getSource();
            thisView = this;
            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            MessageBox.confirm("Przerwać porządkowanie MS " + data.Vlpla + "? Kierownik dostanie e-mail.", {
                title: "Przerwanie porządkowania",
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    oSourceG.getModel().callFunction("/SB_MOVE_tidy_cancel", {
                        method: "POST",
                        urlParameters: {
                            Ui5Guid: data.Ui5Guid,
                            Vlpla: "",
                            ScanMatBatch: ""
                        },
                        success: function (oData) {
                            MessageBox.information(oData.Message || "Porządkowanie przerwane", {
                                onClose: function () {
                                    thisView._backToReceipt();
                                }
                            });
                        },
                        error: function () {
                            oSourceG.getModel().refresh();
                        }
                    });
                }
            });
        },
        _backToReceipt: function () {
            // back to the app we came from (RF Przyjęcia keeps the transport in its hash); started directly - just refresh
            var oCrossAppNav = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
            this.getModel("worklistView").setProperty("/sourceInput", "");
            if (oCrossAppNav && !oCrossAppNav.isInitialNavigation()) {
                oCrossAppNav.backToPreviousApp();
            } else {
                this.getModel().refresh();
            }
        },

        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("worklistView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path: sObjectPath,
                // parameters: {
                // 	'expand': 'toTranExt'
                // },
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
            //this.byId("inputHuScanned").focus();
            //this.getView().byId("idHuWtExist").focus();

        },
        onMove: function (oEvent) {
            oSourceG = oEvent.getSource();
            idNlpla = this.getView().byId("idNlpla");
            oSourceG.getModel().submitChanges();

            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            that = this;
            if (data.VlplaT331Huobl === "X") {
                //HU SB - no dialog, set APPROVED field				
                this.SB_MOVE_set_other_items_proc("");
            } else {
                if (!this.printerDialogMove) {
                    Fragment.load({
                        name: "ewm.s4m.S4D_EWM_RF_SB_MOVE03.S4D_EWM_RF_SU_MV03.view.MoveDialog",
                        controller: this
                    }).then(function (oDialog) {
                        this.printerDialogMove = oDialog;
                        this.getView().addDependent(this.printerDialogMove);
                        //this.printerDialogMove.setModel(this.getView().getModel());
                        //this.byId("idSelectDialogPutaway").getItems().filter([new sap.ui.model.Filter("TorId", "EQ", data.TorId )], "Application");

                        this.printerDialogMove.open();
                        this.printerDialogMove.getAggregation("_dialog").getContent()[1].selectAll();
                    }.bind(this));
                } else {
                    //this.byId("idSelectDialogPutaway").getItems().filter([new sap.ui.model.Filter("TorId", "EQ", data.TorId )], "Application");
                    this.printerDialogMove.open();

                }
            }
        },
        onMoveAuto: function (oEvent) {
            oSourceG = oEvent.getSource();
            idNlpla = this.getView().byId("idNlpla");
            that = this;
            gLblCnt = "";
            gViewModel = this.getModel("worklistView");
            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            if(data.ScanCount > 1){
                 MessageBox.information("Na automat należy skanować jedną partię.");
                 return;
            }
            if(!gPrinter){
                gPrinter = data.PrintDoor;
            }
            gViewModel.setProperty("/busy", true);
            if (!idPrinter) {
                idPrinter = new Button("idPrinter", {
                    type: ButtonType.Emphasized,
                    text: "Druk " + gPrinter,
                    //text: "Druk {PrintDoor}",
                    press: function () {
                        gPrinterDialog.open();
                    }
                });
            };
            if (!idLblCnt) {        
                        idLblCnt = new Input({
                            value: gLblCnt, //gViewModel.getProperty("/scanHuident"),
                            valueLiveUpdate: true,
                            liveChange: function (e) {
                                gLblCnt = e.getParameter("value");
                            }
                        })
            } else {
                idLblCnt.setValue("");
            }
            if (!this.printerDialog) {
                this.printerDialog = new Dialog({
                    title: 'Drukarki',
                    content: new List({
                        //mode: "SingleSelectMaster",
                        items: {
                            path: '/SB_MOVE_PrintersSet',
                            template: new StandardListItem({
                                title: "{PrintDoor}",
                                icon: "sap-icon://print",
                                iconDensityAware: false,
                                iconInset: false,
                                type: "Navigation",
                                press: function (e) {
                                    gPrinterDialog.close();
                                    gPrinter = e.getSource().getProperty("title");
                                    idPrinter.setText("Druk: " + gPrinter);
                                    
                                }
                            })
                        }
                    }),
                    // beginButton: new Button({
                    // 	type: ButtonType.Emphasized,
                    // 	text: 'OK',
                    // 	press: function () {
                    // 		this.printerDialog.close();
                    // 	}.bind(this)
                    // }),
                    endButton: new Button({
                        text: 'Zamknij',
                        press: function () {
                            this.printerDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function () {
                        idLblCnt.focus();                       
                    }                    
                });
                //to get access to the global model
                this.getView().addDependent(this.printerDialog);
                gPrinterDialog = this.printerDialog;
            }

            if (!this.oDialog) {
                this.oDialog = new Dialog({
                    title: "Liczba paczek",
                    type: "Message",
                    content: [
                        new Label({
                            text: "Liczba paczek:"
                        }),
                        idLblCnt
                    ],

                    buttons: [

                        idPrinter,
                        // buttons: 
                        new Button({
                            type: ButtonType.Emphasized,
                            text: "Na Automat",
                            press: function (oEvent2) {
                                if (!gLblCnt) {
                                    MessageBox.information("Nie wprowadzono ilości paczek",{onClose: function (oAction) { idLblCnt.focus(); }});
                                } else {

                                    gDialog.close();
                                    idNlpla.setValue("AUTOMAT");
                                    var context = oSourceG.getBindingContext();
                                    var data = context.getProperty(null, context);
                                    //oSourceG = oEvent2.getSource();    

                                    var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_to_nlpla", {
                                        method: "POST",
                                        urlParameters: {
                                            Ui5Guid: data.Ui5Guid,
                                            Vlpla: data.Vlpla,
                                            Nlpla: data.Nlpla,
                                            Approved: data.Approved,
                                            PrintDoor: gPrinter,
                                            HuCount: gLblCnt
                                        },
                                        success: function (oData, response) {
                                            gViewModel.setProperty("/busy", false);
                                            if (oData.Message) {
                                                if (oData.MessageType === "I") {
                                                    //MessageBox.information(oData.Message);
                                                } else {
                                                    MessageBox.error(oData.Message, {
                                                        //icon: MessageBox.Icon.INFORMATION,
                                                        title: "Błąd przetwarzania docelowego MS",
                                                        onClose: function (oAction) { idNlpla.focus(); }
                                                    });
                                                }
                                            }
                                            if (oData.MessageType === "E") {
                                                idNlpla.setValue("");
                                            } else {
                                                gViewModel.setProperty("/sourceInput", "");
                                                idVlpla.focus();
                                                oSourceG.getModel().submitChanges();
                                                oSourceG.getModel().refresh();
                                            }
                                        },
                                        error: function (oError) {
                                            gViewModel.setProperty("/busy", false);
                                            oSourceG.getModel().resetChanges();
                                        }
                                    });
                                }
                            }
                        }),
                        new Button({
                            text: "Anuluj",
                            press: function () {
                                gDialog.close();
                                gViewModel.setProperty("/busy", false);
                            }
                        })
                    ],
                    afterClose: function () {
                        //gDialog.destroy();                        
                    }
                });
                // to get access to the controller's model
                this.getView().addDependent(this.oDialog);
            }
            //gOtherPackDialog = oDialog;
            this.oDialog.open();
            gDialog = this.oDialog;
            //idPrinter = this.getView().byId("idPrinter");
            //this.SB_MOVE_set_other_items_proc("");            
        },
        callSet_mat_batch: function (pQtyPCE) {
            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_set_mat_batch", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: gData.Ui5Guid,
                    Vlpla: gData.Vlpla,
                    ScanMatBatch: gData.ScanMatBatch,
                    MoveMode: "M",
                    qtyPCE: pQtyPCE
                },
                success: function (oData, response) {

                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message);
                        }
                    }
                    if (oData.MessageType === "E") {
                        idScanMatBatch.setValue("");
                    } else {
                        debugger;
                        GMoveToMMessage = oData.MoveMMessage;
                        gViewModel.setProperty("/DialogMoveMMessage", oData.MoveMMessage);
                        gViewModel.setProperty("/DialogMoveMWeightPce", oData.MoveMWeightPce);
                        gViewModel.setProperty("/DialogMoveMLenghtPce", oData.MoveMLenghtPce);
                        oSourceG.getModel().refresh();

                    }
                },
                error: function (oError) {
//                    oSourceG.getModel().resetChanges();
                }
            });
        },
        onMoveM: function (oEvent) {
            

            oSourceG = oEvent.getSource();
            idNlpla = this.getView().byId("idNlpla");
            that = this;
            gLblCnt = "";
            gViewModel = this.getModel("worklistView");
            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            if(data.ScanCount > 1){
                 MessageBox.information("Przenieś na M - należy skanować jedną partię.");
                 return;
            }

            GMoveToMMessage = "";

            oSourceG = oEvent.getSource();
            var idScanMatBatch = this.getView().byId("idScanMatBatch");
            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            gData = data;
            this.callSet_mat_batch( "" );

            gViewModel.setProperty("/busy", true);

            if (!idLblCnt) {        
				var lcontent = [                                  
                //idLblCnt = new Input({
                new Input({
                    value: gLblCnt, //gViewModel.getProperty("/scanHuident"),
                    //value: "{worklistView>/DialogMoveMMessage}", //gViewModel.getProperty("/scanHuident"),
                    valueLiveUpdate: true,
                    liveChange: function (e) {
                        gLblCnt = e.getParameter("value");
                    },
                    submit: function (e) {
                        
                        that.callSet_mat_batch( gLblCnt );
                    }
                })
            ];
            } else {
                idLblCnt.setValue("");
            }
            if (this.oDialog) {
                this.oDialog.destroy();  
                this.oDialog = "";
            }
            if (!this.oDialog) {
                this.oDialog = new Dialog({
                    title: "Przenieś partię na M",
                    type: "Message",
                    content: [
                        new HBox({
                            justifyContent: "Start",
                            items: new Text({
                                text: "{worklistView>/DialogMoveMMessage}"
                            })
                        }),
                        new HBox({    
                            justifyContent: "Start",
                            items:[                                                  
                            new Label({
                                text: "Podaj ilość SZT:"
                            })
                            ]
                        }),
                        new HBox({    
                            justifyContent: "Start",
                            items:[                                                  
                            lcontent
                            ]
                        }),
                        new HBox({
                            justifyContent: "Start",
                            items: new Text({
                                text: "Waga teoretyczna: {worklistView>/DialogMoveMWeightPce} MG"
                            })
                        }),
                        new HBox({
                            justifyContent: "Start",
                            items: new Text({
                                text: "Ilość metrów: {worklistView>/DialogMoveMLenghtPce} M"
                            })
                        })                                                
                        // idLblCnt
                    ],

                    buttons: [

                        new Button({
                            type: ButtonType.Emphasized,
                            text: "Przenieś na M",
                            press: function (oEvent2) {
                                if (!gLblCnt) {
                                    MessageBox.information("Nie wprowadzono ilości SZT",{onClose: function (oAction) { idLblCnt.focus(); }});
                                } else {

                                    gDialog.close();
                                    idNlpla.setValue("MOVE_M");
                                    var context = oSourceG.getBindingContext();
                                    var data = context.getProperty(null, context);
                                    //oSourceG = oEvent2.getSource();    

                                    var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_to_nlpla", {
                                        method: "POST",
                                        urlParameters: {
                                            Ui5Guid: data.Ui5Guid,
                                            Vlpla: data.Vlpla,
                                            Nlpla: "MOVE_M",
                                            Approved: data.Approved,
                                            PrintDoor: gPrinter,
                                            HuCount: gLblCnt
                                        },
                                        success: function (oData, response) {
                                            gViewModel.setProperty("/busy", false);
                                            if (oData.Message) {
                                                if (oData.MessageType === "I") {
                                                    //MessageBox.information(oData.Message);
                                                } else {
                                                    MessageBox.error(oData.Message, {
                                                        //icon: MessageBox.Icon.INFORMATION,
                                                        title: "Błąd przetwarzania docelowego MS",
                                                        onClose: function (oAction) { idNlpla.focus(); }
                                                    });
                                                }
                                            }
                                            if (oData.MessageType === "E") {
                                                idNlpla.setValue("");
                                            } else {
                                                gViewModel.setProperty("/sourceInput", "");
                                                idVlpla.focus();
                                                oSourceG.getModel().submitChanges();
                                                oSourceG.getModel().refresh();
                                            }
                                        },
                                        error: function (oError) {
                                            gViewModel.setProperty("/busy", false);
                                            oSourceG.getModel().resetChanges();
                                        }
                                    });
                                }
                            }
                        }),
                        new Button({
                            text: "Odśwież",
                            press: function () {
                                //oSourceG.getModel().refresh();
                                that.callSet_mat_batch( gLblCnt );
                            }
                        }),
                        new Button({
                            text: "Anuluj",
                            press: function () {
                                gDialog.close();
                                gViewModel.setProperty("/busy", false);
                            }
                        })
                    ],
                    afterClose: function () {
                        //gDialog.destroy();                        
                    }
                });
                // to get access to the controller's model
                this.getView().addDependent(this.oDialog);
            }
            //gOtherPackDialog = oDialog;
            this.oDialog.open();
            gDialog = this.oDialog;
            //idPrinter = this.getView().byId("idPrinter");
            //this.SB_MOVE_set_other_items_proc("");            
        },
        handleSearchMoveDialog: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("Productno", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        handleCancelMoveDialog: function (oEvent) {
            this.printerDialogMove.destroy();
            this.printerDialogMove = "";
        },
        handleCloseMoveDialog: function (oEvent) {
            var aContexts = oEvent.getParameter("selectedContexts");
            var selectionString = "";
            this.printerDialogMove.destroy();
            this.printerDialogMove = "";
            if (aContexts && aContexts.length) {
                selectionString = aContexts.map(function (oContext) { return oContext.getObject().Matnr + "/" + oContext.getObject().Charg; }).join(",");
                //MessageBox.information("Wybrano" + selectionString );
            } else {
                //MessageBox.information("Nie wybrano pozycji.");
                selectionString = "";
            }

            //var idVlpla = this.getView().byId("idVlpla");
            //var idScanMatBatch = this.getView().byId("idScanMatBatch");
            // idVlpla.setValue("");
            // idScanMatBatch.setValue("");
            //oSourceG.getModel().submitChanges();
            //oSourceG.getModel().refresh();
            that.SB_MOVE_set_other_items_proc(selectionString);

        },
        SB_MOVE_set_other_items_proc: function (pSelectionString) {

            var context = oSourceG.getBindingContext();
            var data = context.getProperty(null, context);
            var oHandle = oSourceG.getModel().callFunction("/SB_MOVE_set_other_items", {
                method: "POST",
                urlParameters: {
                    Ui5Guid: data.Ui5Guid,
                    Vlpla: data.Vlpla,
                    SelectedItems: pSelectionString
                },
                success: function (oData, response) {

                    if (oData.Message) {
                        if (oData.MessageType === "I") {
                            //MessageBox.information(oData.Message);
                        } else {
                            MessageBox.error(oData.Message);
                        }
                    }
                    if (oData.MessageType === "E") {
                        //idScanMatBatch.setValue("");
                    } else {

                        //oSourceG.getModel().resetChanges();
                        //oSourceG.getModel().refresh();
                    }
                    idNlpla.focus();
                    oSourceG.getModel().resetChanges();
                    oSourceG.getModel().refresh();
                },
                error: function (oError) {
                    //oSourceG.getModel().resetChanges();
                    oSourceG.getModel().refresh();
                }
            });
        },
        _onBindingChange: function () {

            return;

            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                //this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the master list
                // does not make sense anymore.
                //this.getOwnerComponent().oListSelector.clearMasterListSelection();
                return;
            }

            var sPath = oElementBinding.getPath(),
                oResourceBundle = this.getResourceBundle(),
                oObject = oView.getModel().getObject(sPath),
                sObjectId = oObject.TorId,
                sObjectName = oObject.TorId,
                oViewModel = this.getModel("worklistView");

            this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
            oViewModel.setProperty("/shareOnJamTitle", sObjectName);
            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
            //Custom
            var context = oElementBinding.getBoundContext();
            //var context2 = oElementBinding.getBoundingContext();
            var data = context.getProperty(null, context);

        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");

            // only update the counter if the length is final and
            this.getModel("worklistView").setProperty("/lineExist", false);
            // the table is not empty
            if (iTotalItems){
                this.getModel("worklistView").setProperty("/lineExist", true);
            }
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
                this.getModel("worklistView").setProperty("/lineExist", true);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);

            // hide "Klient" / "Schemat Długość[mm]" columns when none of the rows carry data
            var aRowData = oTable.getBinding("items") ? oTable.getBinding("items").getContexts().map(function (oContext) {
                return oContext.getObject();
            }) : [];
            this.getModel("worklistView").setProperty("/hasClientColumn", aRowData.some(function (oRow) {
                return !!(oRow && oRow.DestLocDescAddr);
            }));
            this.getModel("worklistView").setProperty("/hasSchemeColumn", aRowData.some(function (oRow) {
                return !!(oRow && (oRow.CutScheme || oRow.CutCl));
            }));
            // HU scanned in an HU-managed warehouse - the list works without item selection and quantity change
            this.getModel("worklistView").setProperty("/hasHuItems", aRowData.some(function (oRow) {
                return !!(oRow && oRow.HuidentSt);
            }));

            // don't steal focus from a row field (e.g. qty) being edited when the table refreshes
            var oActiveElement = document.activeElement;
            if (oTable.getDomRef() && oActiveElement && oTable.getDomRef().contains(oActiveElement)) {
                return;
            }

            // tidy mode: the single scan field takes every scan (batch code or target bin)
            var oHeader = this.getView().getBindingContext() && this.getView().getBindingContext().getObject();
            if (oHeader && oHeader.TidyActive) {
                this.byId("idVlpla").focus();
                return;
            }

            if (!this.byId("idVlpla").getValue()) {
                this.byId("idVlpla").focus();
            } else if (this.byId("idApproved").getText()) {
                this.byId("idNlpla").focus();
            } else if (this.byId("idScanMatBatch").getVisible() && this.byId("idScanMatBatch").getEnabled()) {
                this.byId("idScanMatBatch").focus();
            } else {
                this.byId("idVlpla").focus();
            }
        },

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            //this._showObject(oEvent.getSource());
        },


		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
        onShareInJamPress: function () {
            var oViewModel = this.getModel("worklistView"),
                oShareDialog = sap.ui.getCore().createComponent({
                    name: "sap.collaboration.components.fiori.sharing.dialog",
                    settings: {
                        object: {
                            id: location.href,
                            share: oViewModel.getProperty("/shareOnJamTitle")
                        }
                    }
                });
            oShareDialog.open();
        },

        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any master list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("Matnr", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getProperty("Guid")
            });
        },

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        },
        onBatchStock: function (oEvent) {
            this.oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
            // trigger navigation
            this.oCrossAppNav.toExternal({
                target: {
                    semanticObject: "ZS4MORIS_EWM_COCKPIT",
                    action: "RF_STOCK"
                }
            });
        }

    });
});