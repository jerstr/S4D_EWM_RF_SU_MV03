sap.ui.define([
	"sap/ui/model/Model"
], function (Model) {
	"use strict";

	return Model.extend("ewm.s4m.S4D_EWM_RF_SB_MOVE03.S4D_EWM_RF_SU_MV03.test.unit.helper.FakeI18nModel", {

		constructor : function (mTexts) {
			Model.call(this);
			this.mTexts = mTexts || {};
		},

		getResourceBundle : function () {
			return {
				getText : function (sTextName) {
					return this.mTexts[sTextName];
				}.bind(this)
			};
		}

	});

});