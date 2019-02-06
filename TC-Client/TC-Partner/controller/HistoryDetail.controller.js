sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	
	"use strict";
	
   return BaseController.extend("oem-partner.controller.HistoryDetail", {  
	   
		//#region Init

        onInit: function () {
			this.bus = sap.ui.getCore().getEventBus();
			this.bus.subscribe("flexible", "setMidColumnData", this.setMidColumnData, this);
		},

		onExit: function () {
			this.bus.unsubscribe("flexible", "setMidColumnData", this.setMidColumnData, this);
		},

		initLocals : function() {
			this._bundle = this.getModel("i18n").getResourceBundle();
			this._tenantsHistoryModel = this.getModel("tenantsHistoryData");
			this._customerDataModel = this.getSetModel("customerDataModel");
			this._countriesDataModel = this.getModel("countries");
			this._historyDetailView = this.getSetModel("historyDetailView");
			this._creationMethodModel = this.getModel("creationMethod");
			this._popoverData = this.getSetModel("popoverData");
			this._popoverContactData = this.getSetModel("popoverContactData");
		},

		//#endregion Init

		//#region CustomerData Model

		setMidColumnData : function () {
			if (!this._customerDataModel) {
				this.initLocals();
			}
			
            this.getCustomerData();
		},

        getCustomerData : function () {
			let SelectedCustomerId = this._tenantsHistoryModel.getProperty("/SelectedCustomerId");
			if (!SelectedCustomerId)
			{
				return;
			}
            let methodName = this.getConfModel().getProperty("/server/methodes/getCustomerData");
            let reqURL = this.getServerURL() + methodName + "/" + SelectedCustomerId;
            return $.ajax({
                url: reqURL,
                type: 'GET',
                dataType: 'json'
            }).then(function(result){
                this.handleGetCustomerDataSuccess(result);
            }.bind(this), function(error) {
                this.handleGetCustomerDataError(error);
            }.bind(this));
        },

		handleGetCustomerDataSuccess : function (result) {
			let tempData = {};
			tempData = result;

			tempData.CustomerDtl[0].FullName = tempData.CustomerDtl[0].FirstName + " " + tempData.CustomerDtl[0].LastName;

			let aCountries = this._countriesDataModel.getProperty("/Countries");
			if (aCountries) {
				let C_index = aCountries.findIndex(x => x.Code===tempData.CustomerDtl[0].Country_Code);
				if (C_index >= 0) {
					tempData.CustomerDtl[0].Country_Name = aCountries[C_index].Name;
				}
			}

			switch(tempData.CustomerDtl[0].FinancialPeriod) {
				case "Y":
					tempData.CustomerDtl[0].FinancialPeriodName = this._bundle.getText("periodYearly");
					break;
				case "Q":
					tempData.CustomerDtl[0].FinancialPeriodName = this._bundle.getText("periodQuarterly");
					break;
				case "M":
					tempData.CustomerDtl[0].FinancialPeriodName = this._bundle.getText("stateMonthly");
					break;
				default:
					tempData.CustomerDtl[0].FinancialPeriodName = "";
			}

			if (tempData.CustomerDtl[0].EmailStatus === "Sent") {
				this._historyDetailView.setProperty("/EmailStatusText", this._bundle.getText("EmailStatusSent"));
				this._historyDetailView.setProperty("/EmailStatusState", "Success");
				this._historyDetailView.setProperty("/EmailStatusActive", false);
			} else {
				this._historyDetailView.setProperty("/EmailStatusText", this._bundle.getText("EmailStatusNotSent"));
				this._historyDetailView.setProperty("/EmailStatusState", "Error");
				this._historyDetailView.setProperty("/EmailStatusActive", true);
			}

			this.setTenantStatusData(tempData);

			if (tempData.CustomerDtl[0].ErrorCode) {
				this._historyDetailView.setProperty("/ErrorMessage", tempData.CustomerDtl[0].ErrorCode + ": " + tempData.CustomerDtl[0].ErrorMessage);
			} else {
				this._historyDetailView.setProperty("/ErrorMessage", "");
			}

			if (tempData.CustomerDtl[0].LicensePolicy === "SAME") {
				this._historyDetailView.setProperty("/IsSameLicense", true);
			} else {
				this._historyDetailView.setProperty("/IsSameLicense", false);
			}

			let aCreationMethod = this._creationMethodModel.getProperty("/CreationMethod");
			if (aCreationMethod) {
				let C_index = aCreationMethod.findIndex(x => x.Code===tempData.CustomerDtl[0].CreationMethod);
				if (C_index >= 0) {
					this._historyDetailView.setProperty("/CreationMethodText", aCreationMethod[C_index].Name);
				} else {
					this._historyDetailView.setProperty("/CreationMethodText", "");
				}
			}

			switch(tempData.CustomerDtl[0].ChartOfAccount) {
				case "U":
					tempData.CustomerDtl[0].ChartOfAccountName = this._bundle.getText("COA_UserDefined");
					break;
				case "#":
					tempData.CustomerDtl[0].ChartOfAccountName = this._bundle.getText("COA_PreDefined");
					break;
				default:
					tempData.CustomerDtl[0].ChartOfAccountName = tempData.CustomerDtl[0].ChartOfAccount;
			}

			if (tempData.CustomerDtl[0].IsTrusted === true) {
				this._historyDetailView.setProperty("/AuthenticationText", this._bundle.getText("AuthenticationWindows"));
			} else if (tempData.CustomerDtl[0].IsTrusted === false) {
				this._historyDetailView.setProperty("/AuthenticationText", this._bundle.getText("AuthenticationSBO"));
			} else {
				this._historyDetailView.setProperty("/AuthenticationText", "");
			}

			for(var i = 0; i < tempData.CustomerUsersDtl.length; i++) {
				if (tempData.CustomerUsersDtl[i].Status === "Added") {
					tempData.CustomerUsersDtl[i].StatusText = this._bundle.getText("UserStatusAdded");
					tempData.CustomerUsersDtl[i].StatusState = "Success";
					tempData.CustomerUsersDtl[i].StatusActive = false;
				} else if (tempData.CustomerUsersDtl[i].Status === "Pending") {
					tempData.CustomerUsersDtl[i].StatusText = this._bundle.getText("UserStatusPending");
					tempData.CustomerUsersDtl[i].StatusState = "Warning";
					tempData.CustomerUsersDtl[i].StatusActive = true;
				} else{
					tempData.CustomerUsersDtl[i].StatusText = this._bundle.getText("UserStatusNotAdded");
					tempData.CustomerUsersDtl[i].StatusState = "Error";
					tempData.CustomerUsersDtl[i].StatusActive = true;
				}
			}

			for(var i = 0; i < tempData.CustomerExtDtl.length; i++) {
				if (tempData.CustomerExtDtl[i].Extension_Status === "Assigned") {
					tempData.CustomerExtDtl[i].Extension_StatusText = this._bundle.getText("ExtensionStatusAssign");
					tempData.CustomerExtDtl[i].Extension_StatusState = "Success";
					tempData.CustomerExtDtl[i].Extension_StatusActive = false;
				} else {
					tempData.CustomerExtDtl[i].Extension_StatusText = this._bundle.getText("ExtensionStatusNotAssign");
					tempData.CustomerExtDtl[i].Extension_StatusState = "Error";
					tempData.CustomerExtDtl[i].Extension_StatusActive = true;
				}
			}

			this._customerDataModel.setData(tempData);
		},

		setTenantStatusData : function(data) {
			switch(data.CustomerDtl[0].Status) {
				case "Pending":
					this._historyDetailView.setProperty("/StatusText", this._bundle.getText("TenantStatusPending"));
					this._historyDetailView.setProperty("/StatusState", "Warning");
					this._historyDetailView.setProperty("/StatusActive", true);
					break;
				case "In Process":
					this._historyDetailView.setProperty("/StatusText", this._bundle.getText("TenantStatusInProcess"));
					this._historyDetailView.setProperty("/StatusState", "None");
					this._historyDetailView.setProperty("/StatusActive", false);
					break;
				case "Partial":
					this._historyDetailView.setProperty("/StatusText", this._bundle.getText("TenantStatusPartial"));
					this._historyDetailView.setProperty("/StatusState", "Warning");
					this._historyDetailView.setProperty("/StatusActive", true);
					break;
				case "Failed":
					this._historyDetailView.setProperty("/StatusText", this._bundle.getText("TenantStatusFailed"));
					this._historyDetailView.setProperty("/StatusState", "Error");
					this._historyDetailView.setProperty("/StatusActive", true);
					break;
				case "Success":
					this._historyDetailView.setProperty("/StatusText", this._bundle.getText("TenantStatusSuccess"));
					this._historyDetailView.setProperty("/StatusState", "Success");
					this._historyDetailView.setProperty("/StatusActive", false);
					break;
				default:
					this._historyDetailView.setProperty("/StatusText", data.CustomerDtl[0].Status);
					this._historyDetailView.setProperty("/StatusState", "None");
					this._historyDetailView.setProperty("/StatusActive", false);
			}
		},

		handleGetCustomerDataError : function (result) {

		},

		onUpdateFinishedTable : function (oEvent) {
            // update the worklist's object counter after the table update
            let sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this._bundle.getText("TableTitleCount", [iTotalItems]);
            } else {
                sTitle = this._bundle.getText("TableTitle");
			}
			let parentId = oEvent.getParameters().id;
			if (parentId.includes("idUsersTable")) {
				this._historyDetailView.setProperty("/UsersTableTitle", sTitle);
			} else if (parentId.includes("idExtensionsTable")) {
				this._historyDetailView.setProperty("/ExtensionsTableTitle", sTitle);
			}
		},
		
		//#endregion CustomerData Model

		//#region Close Page

		handleClosePress: function (oEvent) {
			this.bus.publish("flexible", "closeDetailPage");
		},

		//#endregion Close Page

		//#region Popover

		handlePopoverPress: function (oEvent) {
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("oem-partner.view.Popover", this);
				this.getView().addDependent(this._oPopover);
			}

			this.setPopoverData(oEvent);
			if (this._popoverData) {
				this._oPopover.openBy(oEvent.getSource());
			}
		},

		setPopoverData : function (oEvent) {
			let parentId = oEvent.getParameters().id;
			let path, title, placement, errCode, errText, errMessage, state, iconColor, iconSrc;
			if (parentId.includes("idEmailStatus")) {
				path = "/CustomerDtl/0";
				title = this._bundle.getText("EmailStatusTextLable") + " - " + this._historyDetailView.getProperty("/EmailStatusText");
				state = this._historyDetailView.getProperty("/EmailStatusState");
				placement = "Bottom";
				errCode = this._customerDataModel.getProperty(path + "/ErrCode");
				errText = this.getErrorText(errCode);
				let emailErrCodes = ["155", "160", "165"];
				if (emailErrCodes.includes(errCode)) {
					errMessage = this._customerDataModel.getProperty(path + "/ErrMessage");
				} else {
					errCode = this._bundle.getText("NoErrorCode");
					errText = this._bundle.getText("NoErrorMessage");
					errMessage = this._bundle.getText("NoSldErrorMessage");
				}
			} else if (parentId.includes("idTenantStatus")) {
				path = "/CustomerDtl/0";
				title = this._bundle.getText("TenantStatusTextLable") + " - " + this._historyDetailView.getProperty("/StatusText");
				state = this._historyDetailView.getProperty("/StatusState");
				placement = "Bottom";
				errCode = this._customerDataModel.getProperty(path + "/ErrCode");
				errText = this.getErrorText(errCode);
				errMessage = this._customerDataModel.getProperty(path + "/ErrMessage");
			} else if (parentId.includes("idUsersTable")) {
				path = oEvent.getSource().getBindingContext("customerDataModel").getPath();
				title = this._bundle.getText("StatusColumnName") + " - " + this._customerDataModel.getProperty(path + "/StatusText");
				state = this._customerDataModel.getProperty(path + "/StatusState");
				placement = "Top";
				errCode = this._customerDataModel.getProperty(path + "/ErrorCode");
				errText = this.getErrorText(errCode);
				errMessage = this._customerDataModel.getProperty(path + "/ErrorMessage");
			} else if (parentId.includes("idExtensionsTable")) {
				path = oEvent.getSource().getBindingContext("customerDataModel").getPath();
				title = this._bundle.getText("StatusColumnName") + " - " + this._customerDataModel.getProperty(path + "/StatusText");
				state = this._customerDataModel.getProperty(path + "/StatusState");
				placement = "Top";
				errCode = this._customerDataModel.getProperty(path + "/ErrorCode");
				errText = this.getErrorText(errCode);
				errMessage = this._customerDataModel.getProperty(path + "/ErrorMessage");
			}

			if (state === "Error") {
				iconColor = "#BB0000";
				iconSrc = "sap-icon://message-error";
			} else if (state === "Warning") {
				iconColor = "#E78C07";
				iconSrc = "sap-icon://message-warning";
			}

			if (!errCode) {
				errCode = this._bundle.getText("NoErrorCode");
			}
			if (!errMessage) {
				errMessage = this._bundle.getText("NoSldErrorMessage");
			}

			if (title) {
				let oPopoverData = {
					ParentId : parentId,
					Title : title,
					Placement : placement,
					ErrCode : errCode,
					ErrText : errText,
					ErrMessage : errMessage,
					IconColor : iconColor,
					IconSrc : iconSrc
				};
				this._popoverData.setData(oPopoverData);
			} else {
				this._popoverData = null;
			}
			
		},

		handleClosePopover : function (oEvent) {
			this._oPopover.close();
		},

		//#endregion Popover

		//#region PopoverContact

		handlePopoverContactPress: function (oEvent) {
			if (!this._oPopoverContact) {
				this._oPopoverContact = sap.ui.xmlfragment("oem-partner.view.PopoverContact", this);
				this.getView().addDependent(this._oPopoverContact);
			}

			this.setPopoverContactData(oEvent);
			if (this._popoverContactData) {
				this._oPopoverContact.openBy(oEvent.getSource());
			}
		},

		setPopoverContactData : function (oEvent) {
			let path = "/CustomerDtl/0";
			let title = this._bundle.getText("ContactPopoverTitle");
			let placement = "Right";
			let contact = this._customerDataModel.getProperty(path + "/FullName");
			let email = this._customerDataModel.getProperty(path + "/Email");
			let phone = this._customerDataModel.getProperty(path + "/Phone");
			let oPopoverData = {
				Title : title,
				Placement : placement,
				Contact : contact,
				Email : email,
				Phone : phone
			};
			this._popoverContactData.setData(oPopoverData);
		},

		handleClosePopoverContact : function (oEvent) {
			this._oPopoverContact.close();
		}

		//#endregion PopoverContact

    });
});
