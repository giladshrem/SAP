sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	
	"use strict";
	
   return BaseController.extend("oem-partner.controller.HistoryMaster", {  
	   
		//#region Init

        onInit: function () {
			this.getRouter().getRoute("history").attachPatternMatched(this._onRouteMatched, this);
			this.bus = sap.ui.getCore().getEventBus();
			this.bus.subscribe("flexible", "setOneColumnData", this.setOneColumnData, this);
		},

		onExit: function () {
			this.bus.unsubscribe("flexible", "setOneColumnData", this.setOneColumnData, this);
		},

		_onRouteMatched : function() {
			this.onPageLoad();
		},
		
		initLocals : function() {
			this._bundle = this.getView().getModel("i18n").getResourceBundle();
			this._tenantsHistoryModel = this.getModel("tenantsHistoryData");
			this._countriesDataModel = this.getModel("countries");
			
			var oViewModel = new JSONModel({
				RequestedAtVisible : true,
				LastUpdatedAtVisible : true,
				TenantStatusVisible : true,
				CompanyNameVisible : true,
				CountryVisible : true,
				IndustryPackageVisible : true,
				CRNVisible : true,
				ServiceUnitVisible : true,
				TenantsTableTitle : this._bundle.getText("PackagesTableTitle")
			});
			this._historyMasterView = this.getSetModel("historyMasterView", oViewModel);
			this._popoverData = this.getSetModel("popoverData");
		},

		onPageLoad : function() {
            if (!this._tenantsHistoryModel) {
				this.initLocals();
            }
            
            this.getTenantsHistory();
		},
		
		//#endregion Init

		//#region PartnerData Model

		getTenantsHistory : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/getTenantsHistory");
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'POST',
				dataType: 'json',
				contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data),
                success: function(result){
					this.handleGetTenantsHistorySuccess(result);
                }.bind(this),
                error: function(error) {
					this.handleGetTenantsHistoryErrors(error);
                 }.bind(this)               
              });
		},

		handleGetTenantsHistorySuccess : function (result) {
			let tempData = {};
			tempData.Tenants = result;

			let aCountries = this._countriesDataModel.getProperty("/Countries");

			for(let i = 0; i < tempData.Tenants.length; i++) {
				if (aCountries) {
					let C_index = aCountries.findIndex(x => x.Code===tempData.Tenants[i].Country_Code);
					if (C_index >= 0) {
						tempData.Tenants[i].Country_Name = aCountries[C_index].Name;
					}
				}
				
				switch(tempData.Tenants[i].Status) {
					case "Pending":
						tempData.Tenants[i].StatusText = this._bundle.getText("TenantStatusPending");
						tempData.Tenants[i].StatusState = "Warning";
						tempData.Tenants[i].StatusActive = true;
						break;
					case "In Process":
						tempData.Tenants[i].StatusText = this._bundle.getText("TenantStatusInProcess");
						tempData.Tenants[i].StatusState = "None";
						tempData.Tenants[i].StatusActive = false;
						break;
					case "Partial":
						tempData.Tenants[i].StatusText = this._bundle.getText("TenantStatusPartial");
						tempData.Tenants[i].StatusState = "Warning";
						tempData.Tenants[i].StatusActive = true;
						break;
					case "Failed":
						tempData.Tenants[i].StatusText = this._bundle.getText("TenantStatusFailed");
						tempData.Tenants[i].StatusState = "Error";
						tempData.Tenants[i].StatusActive = true;
                        break;
					case "Success":
						tempData.Tenants[i].StatusText = this._bundle.getText("TenantStatusSuccess");
						tempData.Tenants[i].StatusState = "Success";
						tempData.Tenants[i].StatusActive = false;
						break;
					default:
						tempData.Tenants[i].StatusText = tempData.Tenants[i].Status;
						tempData.Tenants[i].StatusState = "None";
						tempData.Tenants[i].StatusActive = false;
                }
			}

			this._tenantsHistoryModel.setData(tempData);
		},

		handleGetTenantsHistoryErrors : function (result) {
			
		},

        onUpdateFinishedTenants : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this._bundle.getText("TableTitleCount", [iTotalItems]);
            } else {
                sTitle = this._bundle.getText("TableTitle");
            }
            this._historyMasterView.setProperty("/TenantsTableTitle", sTitle);
        },

		//#endregion PartnerData Model

		//#region Set Detail Page

		onTenantSelect: function (oEvent) {
			let _index = oEvent.getSource().getSelectedItem().getBindingContext("tenantsHistoryData").sPath.split("/").slice(-1).pop();
			let selectedCustomerId = this._tenantsHistoryModel.getProperty("/Tenants/" + _index + "/id");
			this._tenantsHistoryModel.setProperty("/SelectedCustomerId", selectedCustomerId);
			this.hideColumns();
			this.bus.publish("flexible", "setDetailPage");		
		},

		hideColumns: function () {
			this._historyMasterView.setProperty("/RequestedAtVisible", true);
			this._historyMasterView.setProperty("/LastUpdatedAtVisible", false);
			this._historyMasterView.setProperty("/TenantStatusVisible", true);
			this._historyMasterView.setProperty("/CompanyNameVisible", true);
			this._historyMasterView.setProperty("/CountryVisible", false);
			this._historyMasterView.setProperty("/IndustryPackageVisible", false);
			this._historyMasterView.setProperty("/CRNVisible", false);
			this._historyMasterView.setProperty("/ServiceUnitVisible", false);
		},

		//#endregion Set Detail Page

		//#region Set Master Page

		setOneColumnData: function () {
			this.showAllColumns();
		},

		showAllColumns: function () {
			this._historyMasterView.setProperty("/RequestedAtVisible", true);
			this._historyMasterView.setProperty("/LastUpdatedAtVisible", true);
			this._historyMasterView.setProperty("/TenantStatusVisible", true);
			this._historyMasterView.setProperty("/CompanyNameVisible", true);
			this._historyMasterView.setProperty("/CountryVisible", true);
			this._historyMasterView.setProperty("/IndustryPackageVisible", true);
			this._historyMasterView.setProperty("/CRNVisible", true);
			this._historyMasterView.setProperty("/ServiceUnitVisible", true);
			let oTable = this.getView().byId("idTenantsTable");
			oTable.removeSelections(true);
		},

		//#endregion Set Master Page

		//#region Popover

		handlePopoverPress: function (oEvent) {
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("oem-partner.view.Popover", this);
				this.getView().addDependent(this._oPopover);
			}

			this.setPopOverData(oEvent);

			let oControl = oEvent.getSource();
			this._oPopover.openBy(oControl);
		},

		setPopOverData : function (oEvent) {
			let path = oEvent.getSource().getBindingContext("tenantsHistoryData").getPath();
			let title = this._bundle.getText("TenantStatusTextLable") + " - " + this._tenantsHistoryModel.getProperty(path + "/StatusText");
			let placement = "Right";
			let errCode = this._tenantsHistoryModel.getProperty(path + "/ErrCode");
			let errText = this.getErrorText(errCode);
			let errMessage = this._tenantsHistoryModel.getProperty(path + "/ErrMessage");
			if (!errCode) {
				errCode = this._bundle.getText("NoErrorCode");
			}
			if (!errMessage) {
				errMessage = this._bundle.getText("NoSldErrorMessage");
			}
			let iconColor = "";
			let iconSrc = "";
			if (this._tenantsHistoryModel.getProperty(path + "/StatusState") === "Error") {
				iconColor = "#BB0000";
				iconSrc = "sap-icon://message-error";
			} else if (this._tenantsHistoryModel.getProperty(path + "/StatusState") === "Warning") {
				iconColor = "#E78C07";
				iconSrc = "sap-icon://message-warning";
			}

			let oPopoverData = {
				Title : title,
				Placement : placement,
				ErrCode : errCode,
				ErrText : errText,
				ErrMessage : errMessage,
				IconColor : iconColor,
				IconSrc : iconSrc
			};
			this._popoverData.setData(oPopoverData);
		},

		handleClosePopover : function (oEvent) {
			this._oPopover.close();
		}

		//#endregion Popover

    });
});