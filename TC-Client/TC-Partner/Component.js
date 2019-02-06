sap.ui.define([
	"sap/ui/core/UIComponent",
	"oem-partner/model/models",
	"sap/ui/model/resource/ResourceModel",
	"sap/f/FlexibleColumnLayoutSemanticHelper"
], function (UIComponent, models, FlexibleColumnLayoutSemanticHelper) {
	"use strict";
	return UIComponent.extend("oem-partner.Component", {
		metadata: {
			manifest: "json",	
			config : {	
				fullWidth : true	
			}
		},
		init: function () {
			// call the init function of the parent
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		getContentDensityClass: function () {
			if (!this._sContentDensityClass) {
				if (!sap.ui.Device.support.touch){
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});
});