sap.ui.define([], function () {
	"use strict";

	/**
	 * Trims a fixed-point number to remove trailing zeros
	 * @param {number} fValue the number to format
	 * @param {int} iDigits number of decimal digits to round to
	 * @returns {string} formatted number without trailing zeros
	 */
	function trimmedNumber(fValue, iDigits) {
		return parseFloat(fValue.toFixed(iDigits)).toString();
	}

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit : function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		/**
		 * Builds the item description including the quantity converted to
		 * pieces (SZT), based on the PceUmrez (stock unit side) / PceUmren
		 * (SZT side) conversion factor, e.g. PceUmrez MG <=> PceUmren SZT.
		 * Falls back to the plain description if the conversion factor is
		 * not available.
		 * @public
		 * @param {string} sMaktx material description
		 * @param {string} sQuantitySt quantity in the stock unit of measure
		 * @param {string} sUnitofmeasureSt stock unit of measure
		 * @param {string} sPceUmrez conversion side of the stock unit of measure
		 * @param {string} sPceUmren conversion side of SZT
		 * @returns {string} the composed item description
		 */
		formatItemDescription : function (sMaktx, sQuantitySt, sUnitofmeasureSt, sPceUmrez, sPceUmren) {
			var fQuantitySt = parseFloat(sQuantitySt),
				fUmrez = parseFloat(sPceUmrez),
				fUmren = parseFloat(sPceUmren),
				bIsPieces = ["ST", "SZT"].indexOf((sUnitofmeasureSt || "").trim().toUpperCase()) !== -1,
				sText = (sMaktx || "") + " ( " + (sQuantitySt || "") + " " + (sUnitofmeasureSt || "");

			// material already in pieces (ST) - no need for the SZT conversion
			if (!bIsPieces && fUmrez > 0 && fUmren > 0 && !isNaN(fQuantitySt)) {
				sText += " = " + Math.round(fQuantitySt * fUmren / fUmrez) + " SZT" +
					", 1 SZT = " + trimmedNumber(fUmrez / fUmren, 3) + " " + (sUnitofmeasureSt || "");
			}

			return sText + " )";
		},

		/**
		 * Converts the quantity entered by the user (QtyByUser) to pieces
		 * (SZT), based on the PceUmrez/PceUmren conversion factor. Returns
		 * an empty string when the material is already in pieces or the
		 * conversion factor is not available.
		 * @public
		 * @param {string} sQtyByUser quantity entered by the user
		 * @param {string} sUnitofmeasureSt stock unit of measure
		 * @param {string} sPceUmrez conversion side of the stock unit of measure
		 * @param {string} sPceUmren conversion side of SZT
		 * @returns {string} the converted quantity in SZT, or an empty string
		 */
		formatQtyByUserInPieces : function (sQtyByUser, sUnitofmeasureSt, sPceUmrez, sPceUmren) {
			var fQtyByUser = parseFloat(sQtyByUser),
				fUmrez = parseFloat(sPceUmrez),
				fUmren = parseFloat(sPceUmren),
				bIsPieces = ["ST", "SZT"].indexOf((sUnitofmeasureSt || "").trim().toUpperCase()) !== -1;

			if (bIsPieces || isNaN(fQtyByUser) || !(fUmrez > 0) || !(fUmren > 0)) {
				return "";
			}

			return "= " + Math.round(fQtyByUser * fUmren / fUmrez) + " SZT";
		}

	};

});