/* global QUnit */

QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function() {
	"use strict";

	sap.ui.require([
		"ewm/s4m/S4D_EWM_RF_SB_MOVE03/S4D_EWM_RF_SU_MV03/test/integration/AllJourneys"
	], function() {
		QUnit.start();
	});
});