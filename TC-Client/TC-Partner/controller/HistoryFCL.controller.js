sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	
	"use strict";
	
   return BaseController.extend("oem-partner.controller.HistoryFCL", {  
	   
		//#region Init

        onInit: function () {
			this.bus = sap.ui.getCore().getEventBus();
			this.bus.subscribe("flexible", "setDetailPage", this.setDetailPage, this);
			this.bus.subscribe("flexible", "closeDetailPage", this.closeDetailPage, this);

			this.oFlexibleColumnLayout = this.byId("idFCL");
        },

		onExit: function () {
			this.bus.unsubscribe("flexible", "setDetailPage", this.setDetailPage, this);
			this.bus.unsubscribe("flexible", "closeDetailPage", this.closeDetailPage, this);
		},

		//#endregion Init

		//#region Set Pages

		setDetailPage: function () {
			if (!this.detailView) {
				this.detailView = sap.ui.view({
					id: "midView",
					viewName: "oem-partner.view.HistoryDetail",
					type: "XML"
				});

				this.oFlexibleColumnLayout.addMidColumnPage(this.detailView);
			}

			this.oFlexibleColumnLayout.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);
			this.bus.publish("flexible", "setMidColumnData");
		},

		closeDetailPage: function () {
			this.oFlexibleColumnLayout.setLayout(sap.f.LayoutType.OneColumn);
			this.bus.publish("flexible", "setOneColumnData");
		}

		//#endregion Set Pages

    });
});