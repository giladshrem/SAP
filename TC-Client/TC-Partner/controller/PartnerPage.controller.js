sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(BaseController, JSONModel, MessageToast, MessageBox) {
	
	"use strict";
	
   return BaseController.extend("oem-partner.controller.PartnerPage", {  
	   
		//#region Init

		onInit : function () {
			this.getRouter().getRoute("partner").attachPatternMatched(this._onRouteMatched, this);
		},

		_onRouteMatched : function(oEvent) {
			this.onPageLoad();
		},

		onPageLoad : function(oEvent) {
			if (!this._PartnerDataModel) {
				this.initLocals();
			}
			else {
				if (this._PartnerDataModel.getProperty("/Temp_Status") === "saveTemplate") {
					this.handleSave(oEvent);
					this._PartnerDataModel.setProperty("/Temp_Status", "afterSaveTemplate");
				} else {
					this.getPartnerCombos();
				}
			}
			if (this._partnerView) {
				this._partnerView.setProperty("/edited", false);
				this._partnerView.setProperty("/emailPasswordEdited", false);
			}
		},

		initLocals : function() {
			this._bundle = this.getModel("i18n").getResourceBundle();
			// Model used to manipulate control states
            let oViewModel = new JSONModel({
				pageStatus : "load",
				edited : false,
				emailPassword : "",
				emailPasswordEdited : false,
				saveButtonEnabled :false,
				saveButtonVisible : false,
				PackagesTableTitle : this._bundle.getText("PackagesTableTitle"),
				userPrefixEnabled : false,
				userPrefixSelect : [
					{Code : 1, Name : "1"},
					{Code : 2, Name : "2"},
					{Code : 3, Name : "3"},
					{Code : 4, Name : "4"},
					{Code : 5, Name : "5"},
					{Code : 6, Name : "6"}
				],
				emailCccVisible : false,
				gmailVisible : false
			});
			this._partnerView = this.getSetModel("partnerView", oViewModel);

			this._PartnerDataModel = this.getModel("PartnerData");
			this._emptyPartnerDataModel = this.getModel("emptyPartnerData");
			this._PartnerCombosModel = this.getModel("PartnerCombos");
			this._savePartnerCombosModel = this.getModel("savePartnerData");
			this._countriesDataModel = this.getModel("countries");
			this.initWizardReview();
			this.getPartnerCombos();
		},

		setActivePage : function() {
			if (this._partnerView.getProperty("/pageStatus") === "load") {
				var emailServerType = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailServerTypeName");
				if (emailServerType) {
					for(var i = 1; i < this._wizard.getSteps().length; i++) {
						this._wizard.nextStep();
					}
					this._wizard.fireComplete();
				}
				this._partnerView.setProperty("/pageStatus", "ok");
			}
		},

		//#endregion Init

		//#region PartnerCombos Model

		getPartnerCombos : function () {
			let methodName = this.getConfModel().getProperty("/server/methodes/getPartnerCombos");
			let serverURL = this.getServerURL();
			if (!serverURL) {
				return;
			}
            let reqURL =  serverURL + methodName;
            return $.ajax({
                url: reqURL,
                type: 'GET',
                dataType: 'json',
            }).then(function(result){
					this.setPartnerCombos(result);
                }.bind(this), function(error) {
					this.handleGetPartnerCombosErrors(error);
                }.bind(this));
		},

		handleGetPartnerCombosErrors : function (result) {
            jQuery.sap.log.error(result);
            var msg;
            if (result.status) {
                switch(result.status) {
					case 500:
						msg = this._bundle.getText("ServerError500");
					break;
					case 503:
                        msg = this._bundle.getText("ServerError503");
                        break;
                    default:
                        msg = this._bundle.getText("GeneralServerError");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
		},
		
		setPartnerCombos : function (data) {
			var a = {};
			for(var i = 0; i < data.licensefiles.d.results.length; i++) {
				a[data.licensefiles.d.results[i].ID] = {
					"InstallationNumber": data.licensefiles.d.results[i].InstallationNumber,
					"ServerName": data.licensefiles.d.results[i].LicenseServer.Name
				};
			}
			data.licenseFilesModules = [];
			if ((data.licensemodules) && (Array.isArray(data.licensemodules))) {
				for(var i = 0; i < data.licensemodules.length; i++) {
					var licenseFileID = data.licensemodules[i].d.licenseFileID;
					var installationNumber = a[licenseFileID].InstallationNumber;
					var serverName = a[licenseFileID].ServerName;
					for(var j = 0; j < data.licensemodules[i].d.results.length; j++) {
						data.licenseFilesModules.push({"LicenseFile_Id": licenseFileID,
							"InstallationNumber": installationNumber, 
							"ServerName": serverName,
							"Type": data.licensemodules[i].d.results[j].Type,
							"Description": data.licensemodules[i].d.results[j].Description,
							"Available": data.licensemodules[i].d.results[j].Available});
					}
				}
			}
			data.EmailTypes = [];
			data.EmailTypes.push({"Code" : "", "Name" : ""});
			data.EmailTypes.push({"Code" : "CCC", "Name" : this._bundle.getText("EmailCCCSelectItem")});
			data.EmailTypes.push({"Code" : "Gmail", "Name" : this._bundle.getText("GmailSelectItem")});

			this._PartnerCombosModel.setData(data);
			this.getPartnerData();
		},

		//#endregion PartnerCombos Model

		//#region PartnerData Model

		getPartnerData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getPartnerData");
			let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'GET',
				dataType: 'json'
			}).then(function(result){
					this.setPartnerData(result);
				}.bind(this), function(error) {
					this.handleGetPartnerDataErrors(error);
                }.bind(this));
		},

		setPartnerData : function (data) {
			if ((!data.Cloud_Setting) || (data.Cloud_Setting.length == 0)){
				data.Cloud_Setting = JSON.parse(JSON.stringify(this._emptyPartnerDataModel.oData.Cloud_Setting));
			}

			if ((data.Cloud_Setting[0].Prefix) || (data.Cloud_Setting[0].Separator)) {
				this._partnerView.setProperty("/userPrefixEnabled", true);
			}

			let aCountries = this._countriesDataModel.getProperty("/Countries");

			for(let i = 0; i < data.Templates.length; i++) {

				let SU_Id = data.Templates[i].HostingUnit_Id;
				let index = this._PartnerCombosModel.oData.serviceunits.d.results.findIndex(x => x.ID==SU_Id);
				if (index >= 0) {
					let SU_Name = this._PartnerCombosModel.oData.serviceunits.d.results[index].Name;
					data.Templates[i].HostingUnit_Name = SU_Name;
				}

				data.Templates[i].Templates_Extenstions = [];
				if (data.Templates[i].IsTrusted) {
					data.Templates[i].Authentication = "win";
				} else {
					data.Templates[i].Authentication = "sbo";
				}
				data.Templates[i].IsSameLicense = (data.Templates[i].LicensePolicy == "SAME");
				data.Templates[i].Templates_Licenses = [];
				data.Templates[i].Templates_Operators = [];
				for(let j = 0; j < data.Templates[i].Templates_Operators.length; j++) {
					data.Templates[i].Templates_Operators[j].Operators_licenses = [];
				}

				let P_Id = data.Templates[i].IndPackageId;
				let P_index = data.Packages.findIndex(x => x.Id==P_Id);
				if (P_index >= 0) {
					let P_Name = data.Packages[P_index].Name;
					data.Templates[i].IndPackageName = P_Name;
				}
				
				let C_Id = data.Templates[i].Country_Code;	
				if (aCountries) {
					let C_index = aCountries.findIndex(x => x.Code==C_Id);
					if (C_index >= 0) {
						let C_Name = aCountries[C_index].Name;
						data.Templates[i].Country_Name = C_Name;
					}
				}
			}

			for(let i = 0; i < data.Templates_Extenstions.length; i++) {
				let TId = data.Templates_Extenstions[i].TemplateId;
				let index = data.Templates.findIndex(x => x.id==TId);
				if (index >= 0)	{
					data.Templates[index].Templates_Extenstions.push(data.Templates_Extenstions[i]);
				}
			}

			for(let i = 0; i < data.Templates_Licenses.length; i++) {
				let TId = data.Templates_Licenses[i].TemplateId;
				let index = data.Templates.findIndex(x => x.id==TId);
				if (index >= 0)	{
					data.Templates[index].Templates_Licenses.push(data.Templates_Licenses[i]);
				}
			}

			for(let i = 0; i < data.Templates_Operators.length; i++) {
				let TId = data.Templates_Operators[i].TemplateId;
				let index = data.Templates.findIndex(x => x.id==TId);
				if (index >= 0)	{
					data.Templates_Operators[i].PowerUser_enabled = !data.Templates_Operators[i].SuperUser;
					if (data.Templates_Operators[i].SuperUser) {
						data.Templates_Operators[i].PowerUser = true;
					}
					data.Templates[index].Templates_Operators.push(data.Templates_Operators[i]);
				}
			}

			for(let i = 0; i < data.Operators_licenses.length; i++) {
				let TId = data.Operators_licenses[i].TemplateId;
				let indexTemplates = data.Templates.findIndex(x => x.id==TId);
				if (indexTemplates >= 0) {
					let UId = data.Operators_licenses[i].User_Id;
					let indexOperators = data.Templates[indexTemplates].Templates_Operators.findIndex(x => x.User_Id==UId);
					if (indexOperators >= 0) {
						if (!data.Templates[indexTemplates].Templates_Operators[indexOperators].Operators_licenses) {
							data.Templates[indexTemplates].Templates_Operators[indexOperators].Operators_licenses = [];
						}
						data.Templates[indexTemplates].Templates_Operators[indexOperators].Operators_licenses.push(data.Operators_licenses[i]);
					}
				}
			}
			
			data.Temp_Status = "afterSetPartnerData";
			this._PartnerDataModel.setData(data);
			this.setUserPrefixSimulation();
			this.setEmailData(true);
			this.setActivePage();
		},

		handleGetPartnerDataErrors : function (result) {
            var msg;
            if (result.status) {
                switch(result.status) {
                    case 503:
                        msg = this._bundle.getText("ServerError503");
                        break;
                    default:
                        msg = this._bundle.getText("ServerError503");
                }
            } else {
                msg = this._bundle.getText("GetPartnerDataError");
            }
            MessageBox.error(msg);
		},
		
		//#endregion PartnerData Model

		//#region Industry Package Step

        onUpdateFinishedPackage : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this._bundle.getText("PackagesTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this._bundle.getText("PackagesTableTitle");
            }
            this._partnerView.setProperty("/PackagesTableTitle", sTitle);
        },

		onAddRowPackage : function() {
			this._partnerView.setProperty("/edited", true);
			var msgPackageNameEmpty = this._bundle.getText("PackageNameEmptyStateText");
			var newRowPackage = {  
				"Id":null,
				"Name":"",
				"Description":"",
				"_valueState":"Error",
				"_valueStateText":msgPackageNameEmpty
			};
			if (this._PartnerDataModel.oData.Packages.length == 0)
				newRowPackage.Id = 1;
			else
				newRowPackage.Id = Math.max.apply(Math, this._PartnerDataModel.oData.Packages.map(function(o) { return o.Id; })) + 1;
			this._PartnerDataModel.oData.Packages.push(newRowPackage);

			this._wizard.invalidateStep(this.byId("PackagesStep"));
			this._partnerView.setProperty("/saveButtonEnabled", false);
            this._PartnerDataModel.refresh();
		},

		onDeleteRowPackage : function(oEvent) {
			let msg = this._bundle.getText("PackageDeleteMsgs");
			let idx = oEvent.getParameter('listItem').getBindingContext("PartnerData").getPath().split("/")[2];
			MessageBox.warning(
				msg,
				{
					icon: MessageBox.Icon.WARNING,
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction == "YES") {
							let aPackages = this._PartnerDataModel.getProperty("/Packages");
							aPackages.splice(idx, 1);
							this._PartnerDataModel.setProperty("/Packages", aPackages);
							this._partnerView.setProperty("/edited", true);
							this._partnerView.setProperty("/saveButtonEnabled", true);
						}
					}.bind(this)
				}
			);
		},
		
		onLiveChangePackageName : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			var packageName = oEvent.getParameters().value;
			var idx = oEvent.getSource().getBindingContext("PartnerData").getPath().split("/")[2];
			var isExists = false;

			if (packageName) {
				var index = this._PartnerDataModel.oData.Packages.findIndex(x => x.Name==packageName);
				if ((index >= 0) && (idx != String(index))) {
					isExists = true;
					this.showError("PackageDuplicateMsgs");
					var msgPackageNameExists = this._bundle.getText("PackageNameExistsStateText");
					this._PartnerDataModel.oData.Packages[idx]._valueStateText = msgPackageNameExists;
				}
			} else {
				var msgPackageNameEmpty = this._bundle.getText("PackageNameEmptyStateText");
				this._PartnerDataModel.oData.Packages[idx]._valueStateText = msgPackageNameEmpty;
			}

			if (packageName && !isExists) {
				delete this._PartnerDataModel.oData.Packages[idx]._valueState;
				delete this._PartnerDataModel.oData.Packages[idx]._valueStateText;
			} else {
				this._PartnerDataModel.oData.Packages[idx]._valueState = "Error";
			}

			this._PartnerDataModel.refresh();

			this.validatePackagesStep();
		},

		onLiveChangePackageDesc : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			this.validatePackagesStep();
		},

		validatePackagesStep : function () {
			let bValidation = true;

            for(let i = 0; i < this._PartnerDataModel.oData.Packages.length; i++) {
                if (this._PartnerDataModel.oData.Packages[i]._valueState) {
                    bValidation = false;
                }
			}

			if (bValidation) {
				this._wizard.validateStep(this.byId("PackagesStep"));
				this._partnerView.setProperty("/saveButtonEnabled", true);
			} else {
				this._wizard.invalidateStep(this.byId("PackagesStep"));
				this._partnerView.setProperty("/saveButtonEnabled", false);
			}
		},

		checkIfExists : function(obj, prop, newVal) {
			return obj.some(function(e) {
				return e[prop] === newVal;
			});
		},

		showError: function(msg) {
			var msgText = this._bundle.getText(msg);
			MessageBox.error(msgText);
		},

		//#endregion Industry Package Step

		//#region User Prefix

		onActivateUserPrefix : function() {

		},

		onSelectUseUserPrefix : function(oEvent) {
			this._partnerView.setProperty("/edited", true);
			let useUserPrefix = oEvent.getParameter("selected");
			if (useUserPrefix) {
				this._PartnerDataModel.setProperty("/Cloud_Setting/0/Prefix", 1);
				this._PartnerDataModel.setProperty("/Cloud_Setting/0/Separator", "");
				this._partnerView.setProperty("/userSeparatorVS", "Error");
			} else {
				this._PartnerDataModel.setProperty("/Cloud_Setting/0/Prefix", null);
				this._PartnerDataModel.setProperty("/Cloud_Setting/0/Separator", "");
				this._partnerView.setProperty("/userSeparatorVS", "None");
			}
			this.setUserPrefixSimulation();
			this.validateUserPrefixStep();
		},

		onChangeUserPrefix : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			this.setUserPrefixSimulation();
			this.validateUserPrefixStep();
		},

		onLiveChangeUserSeparator : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			let newValue = oEvent.getParameters().value;
			this._PartnerDataModel.setProperty("/Cloud_Setting/0/Separator", newValue);
			if ((!newValue) || (!/^[\w\-.]+$/.test(newValue))) {
				this._partnerView.setProperty("/userSeparatorVS", "Error");
			} else {
				this._partnerView.setProperty("/userSeparatorVS", "None");
			}
			this.validateUserPrefixStep();
			this.setUserPrefixSimulation();
		},

		validateUserPrefixStep : function () {
			if (this._partnerView.getProperty("/userSeparatorVS") === "Error") {
				this._wizard.invalidateStep(this.byId("UserPrefix"));
				this._partnerView.setProperty("/saveButtonEnabled", false);
			} else {
				this._wizard.validateStep(this.byId("UserPrefix"));
				this._partnerView.setProperty("/saveButtonEnabled", true);
			}
		},

		setUserPrefixSimulation : function () {
			if (this._partnerView.getProperty("/userPrefixEnabled")) {
				let prefix = this._PartnerDataModel.getProperty("/Cloud_Setting/0/Prefix");
				let separator = this._PartnerDataModel.getProperty("/Cloud_Setting/0/Separator");
				this._partnerView.setProperty("/userPrefixSimulation", "Castro".substring(0, prefix) + separator + 'John');
			} else {
				this._partnerView.setProperty("/userPrefixSimulation", "");
			}
		},

		//#endregion User Prefix

		//#region Email Step

		setEmailData : function (isInnerEvent) {
			let emailServerType = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailServerType");
			let emailServerType_Name = "";
			if (emailServerType) {
				let emailServerType_index = this._PartnerCombosModel.getProperty("/EmailTypes").findIndex(x => x.Code==emailServerType);
				if (emailServerType_index >= 0) {
					emailServerType_Name = this._PartnerCombosModel.getProperty("/EmailTypes/" + emailServerType_index + "/Name");
				}
			}
			this._PartnerDataModel.setProperty("/Cloud_Setting/0/EmailServerTypeName", emailServerType_Name);

			let isGmail = (emailServerType == "Gmail");
			if (isInnerEvent) {//After getting partner data from server
				//The e-mail password that is received from the server is encrypted. 
				//This information is required in order to know whether the value is empty.
				this._partnerView.setProperty("/emailPassword", this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailPassword"));
			} else {//When user change EmailType
				this._PartnerDataModel.setProperty("/Cloud_Setting/0/EmailUsername", "");
				this._partnerView.setProperty("/emailPassword", "");
				if ((isGmail) || (!emailServerType)) {
					this._PartnerDataModel.setProperty("/Cloud_Setting/0/EmailSendTo", "");
				}
				else {
					let defaultFromEmailAddress = this._PartnerCombosModel.getProperty("/email/d/results/0/DefaultFromEmailAddress");
					this._PartnerDataModel.setProperty("/Cloud_Setting/0/EmailSendTo", defaultFromEmailAddress);
				}
			}
			this.toggleEmailInputs(isGmail);
		},

		toggleEmailInputs : function (isGmail) {
			this._partnerView.setProperty("/emailCccVisible", !isGmail);
			this._partnerView.setProperty("/gmailVisible", isGmail);
		},

		onActivateEmailStep : function() {
			this.validateEmailServerType(true);
			this.validateEmailSendTo();
			this.validateGmailUser();
			this.validateGmailPassword();

			this.emailStepValidation();
		},

		onChangeEmailType : function() {
			this._partnerView.setProperty("/edited", true);
			this.setEmailData(false);
			this.validateEmailServerType();
		},

		onLiveChangeEmailSendTo : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			this.validateEmailSendTo(oEvent);
		},

		onLiveChangeGmailUser : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			this.validateGmailUser(oEvent);
		},

		onChangeGmailUser : function () {
			this._partnerView.setProperty("/edited", true);
			var emailUsername = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailUsername");
			this._PartnerDataModel.setProperty("/Cloud_Setting/0/EmailSendTo", emailUsername);
			this.validateEmailSendTo();
			this.emailStepValidation();
		},

		onLiveChangeGmailPassword : function (oEvent) {
			this._partnerView.setProperty("/edited", true);
			this._partnerView.setProperty("/emailPasswordEdited", true);
			this.validateGmailPassword(oEvent);
		},

		validateEmailServerType : function(isInnerEvent) {
			let sValue = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailServerType");
            if (!sValue) {
                this._partnerView.setProperty("/emailTypeVS", "Error");
            } else {
				this._partnerView.setProperty("/emailTypeVS", "None");
			}

			if (!isInnerEvent) {
				this.validateEmailSendTo();
				if (sValue == "Gmail") {
					this.validateGmailUser();
					this.validateGmailPassword();
				}

				this.emailStepValidation();
			}
		},

		validateEmailSendTo : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailSendTo");
			}

            if (!sValue) {
				this._partnerView.setProperty("/emailSendToVS", "Error");
            } else {
				this._partnerView.setProperty("/emailSendToVS", "None");
            }

			if (oEvent) {
				this.emailStepValidation();
			}
		},

		validateGmailUser : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailUsername");
			}

            if (!sValue) {
				this._partnerView.setProperty("/gmailUserVS", "Error");
            } else {
				this._partnerView.setProperty("/gmailUserVS", "None");
			}
			
			if (oEvent) {
				this.emailStepValidation();
			}
		},

		validateGmailPassword : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._partnerView.getProperty("/emailPassword");
			}

            if (!sValue) {
				this._partnerView.setProperty("/gmailPasswordVS", "Error");
            } else {
				this._partnerView.setProperty("/gmailPasswordVS", "None");
			}

			if (oEvent) {
				this.emailStepValidation();
			}
		},

		emailStepValidation : function() {
			let emailServerType = this._PartnerDataModel.getProperty("/Cloud_Setting/0/EmailServerType");
			let isGmail = (emailServerType === "Gmail");

			if ((this._partnerView.getProperty("/emailTypeVS") === "Error") || (this._partnerView.getProperty("/emailSendToVS") === "Error")) {
				this._wizard.invalidateStep(this.byId("EmailStep"));
				this._partnerView.setProperty("/saveButtonEnabled", false);
				return;
			}

			if ((isGmail) && ((this._partnerView.getProperty("/gmailUserVS") === "Error") || (this._partnerView.getProperty("/gmailPasswordVS") === "Error"))) {
				this._wizard.invalidateStep(this.byId("EmailStep"));
				this._partnerView.setProperty("/saveButtonEnabled", false);
				return;
			}

			this._wizard.validateStep(this.byId("EmailStep"));
			this._partnerView.setProperty("/saveButtonEnabled", true);
		},

		//#endregion Email Step

		//#region Template Step

		onAddTemplate : function() {
			let newRowTemplates = JSON.parse(JSON.stringify(this._emptyPartnerDataModel.getProperty("/Templates/0")));
			let aTemplates = this._PartnerDataModel.getProperty("/Templates");
			if (aTemplates.length == 0) {
				newRowTemplates.id = 1;
			} else {
				newRowTemplates.id = Math.max.apply(Math, aTemplates.map(function(o) { return o.id; })) + 1;
			}
			aTemplates.push(newRowTemplates);
			let _index = aTemplates.length - 1;
			this._PartnerDataModel.setProperty("/Templates", aTemplates);
			this._PartnerDataModel.setProperty("/Temp_Status", "newTemplate");
			this.getRouter().navTo("template", {index: _index});
		},

		onEditTemplate : function(oEvent) {			
			var templatePath = oEvent.getSource().getBindingContext("PartnerData").getPath();
			var _index = templatePath.split("/").slice(-1).pop();
			this.getRouter().navTo("template", {index: _index});
		},

		onDeleteTemplate : function(oEvent) {
			let msg = this._bundle.getText("TemplateDeleteMsgs");
			let idx = oEvent.getParameter('listItem').getBindingContext("PartnerData").getPath().split("/")[2];
			MessageBox.warning(
				msg,
				{
					icon: MessageBox.Icon.WARNING,
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction == "YES") {
							let aTemplates = this._PartnerDataModel.getProperty("/Templates");
							aTemplates.splice(idx, 1);
							this._PartnerDataModel.setProperty("/Templates", aTemplates);
							this._partnerView.setProperty("/edited", true);
							this._partnerView.setProperty("/saveButtonEnabled", true);
						}
					}.bind(this)
				}
			);
		},

		//#endregion Template Step

		//#region Send PartnerData Model

		handleSave : function (oEvent) {
			if (((this._partnerView.getProperty("/pageStatus") != "ok") || !(this._partnerView.getProperty("/edited"))) &&
				(this._PartnerDataModel.getProperty("/Temp_Status") != "saveTemplate")) {
				return;
			}

			if (this._partnerView.getProperty("/emailPasswordEdited")) {
				this.sendEmailPassword({"EmailPassword" : this._partnerView.getProperty("/emailPassword")});
			} else {
				this.handlePartnerDataSave();
			}
		},

		handlePartnerDataSave : function() {
			var saveData = {};
			saveData.CloudConfiguration = this._PartnerDataModel.oData.Cloud_Setting;
			saveData.CloudConfiguration[0].SldVersion = this._PartnerCombosModel.getProperty("/sldVersion/d/results/0/Value");
			saveData.IndPackages = this._PartnerDataModel.oData.Packages;
			saveData.Templates = [];
			saveData.TemplatesExtensions = [];
			saveData.TemplatesLicenses = [];
			saveData.TemplatesOperators = [];
			saveData.OperatorsLicenses = [];
			if (!this._PartnerDataModel.oData.Templates)
				return;
			for(var i = 0; i < this._PartnerDataModel.oData.Templates.length; i++) {
				saveData.Templates.push(JSON.parse(JSON.stringify(this._PartnerDataModel.oData.Templates[i])));
				if (!saveData.Templates[i].IndPackageId) {
					saveData.Templates[i].IndPackageId = 0;
				}
				if (saveData.Templates[i].Authentication === "win") {
					saveData.Templates[i].IsTrusted = true;
				} else {
					saveData.Templates[i].IsTrusted = false;
				}
				if (saveData.Templates[i].IsSameLicense) {
					saveData.Templates[i].LicensePolicy = "SAME";
				} else {
					saveData.Templates[i].LicensePolicy = "Different";
				}
				if (saveData.Templates[i].SystemLanguage == -1){
					saveData.Templates[i].SystemLanguage = null;
				}
				if (saveData.Templates[i].Templates_Extenstions) {
					for(var j = 0; j < this._PartnerDataModel.oData.Templates[i].Templates_Extenstions.length; j++) {
						saveData.TemplatesExtensions.push(JSON.parse(JSON.stringify(this._PartnerDataModel.oData.Templates[i].Templates_Extenstions[j])));
					}
					delete saveData.Templates[i].Templates_Extenstions;
				}
				if (saveData.Templates[i].Templates_Licenses) {
					for(var j = 0; j < this._PartnerDataModel.oData.Templates[i].Templates_Licenses.length; j++) {
						saveData.TemplatesLicenses.push(JSON.parse(JSON.stringify(this._PartnerDataModel.oData.Templates[i].Templates_Licenses[j])));
					}
					delete saveData.Templates[i].Templates_Licenses;
				}
				if (saveData.Templates[i].Templates_Operators) {
					for(var j = 0; j < this._PartnerDataModel.oData.Templates[i].Templates_Operators.length; j++) {
						var temp = JSON.parse(JSON.stringify(this._PartnerDataModel.oData.Templates[i].Templates_Operators[j]));
						delete temp.Operators_licenses;
						saveData.TemplatesOperators.push(JSON.parse(JSON.stringify(temp)));
						if (saveData.Templates[i].Templates_Operators[j].Operators_licenses) {
							for(var k = 0; k < this._PartnerDataModel.oData.Templates[i].Templates_Operators[j].Operators_licenses.length; k++) {
								saveData.OperatorsLicenses.push(JSON.parse(JSON.stringify(this._PartnerDataModel.oData.Templates[i].Templates_Operators[j].Operators_licenses[k])));
							}
							
							delete saveData.Templates[i].Templates_Operators[j].Operators_licenses;
						}
					}
					delete saveData.Templates[i].Templates_Operators;
				}
			}
			jQuery.sap.log.debug(JSON.stringify(saveData));
			this.sendPartnerData(saveData);
		},

		sendPartnerData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/savePartnerData");
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'POST',
				dataType: 'json',
				contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data),
                success: function(result){
					this.handleSendPartnerDataSuccess(result);
                }.bind(this),
                error: function(error) {
					this.handleSendPartnerDataErrors(error);
                 }.bind(this)               
              });
		},

		handleSendPartnerDataSuccess : function (result) {
			let msg = this._bundle.getText("saveSuccess");
			MessageToast.show(msg);
			this._partnerView.setProperty("/saveButtonEnabled", false);
			this._partnerView.setProperty("/edited", false);
		},

		handleSendPartnerDataErrors : function (result) {
			let msg = this._bundle.getText("saveError");
			MessageToast.show(msg);
		},

		sendEmailPassword : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/saveEmailPassword");
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'POST',
				dataType: 'json',
				contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data),
                success: function(result){
					this.handleSendEmailPasswordSuccess(result);
                }.bind(this),
                error: function(error) {
					this.handleSendEmailPasswordErrors(error);
                 }.bind(this)               
              });
		},

		handleSendEmailPasswordSuccess : function (result) {
			this.handlePartnerDataSave();
		},

		handleSendEmailPasswordErrors : function (result) {
			let msg = this._bundle.getText("saveError");
			MessageToast.show(msg);
		},

		//#endregion Send PartnerData Model

		//#region Review Wizard

		initWizardReview : function () {
			this._wizard = this.byId("partnerConfWizard");
			this._oWizardContentPage = this.byId("partnerConfContentPage");
			this._oWizardReviewPage = sap.ui.xmlfragment("oem-partner.view.PartnerReview", this);
			this._oNavContainer = this.byId("partnerConfNavContainer");
			this._oNavContainer.addPage(this._oWizardReviewPage);
		},

		wizardCompletedHandler : function (oEvent) {
			this.handleSave(oEvent);
			this.navToWizardReview();
		},

		navToWizardReview : function () {
			this._oNavContainer.to(this._oWizardReviewPage);
		},

		navToWizardEdit : function () {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},
		
		editStepOne : function () {
			this._handleNavigationToStep(0);
		},

		editStepTwo : function () {
			this._handleNavigationToStep(1);
		},

		editStepThree : function () {
			this._handleNavigationToStep(2);
		},

		editStepFour : function () {
			this._handleNavigationToStep(3);
		},

		_handleNavigationToStep : function (iStepNumber) {
			var fnAfterNavigate = function () {
				this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this.navToWizardEdit();
			this._partnerView.setProperty("/saveButtonVisible", true);
			this._partnerView.setProperty("/saveButtonEnabled", false);
		},
		
		onSave : function(oEvent) {
			this.handleSave(oEvent);
		},

		onCancel : function(oEvent) {
			if (!this._partnerView.getProperty("/edited")) {
				location.reload();
				return;
			}

			var msg = this._bundle.getText("DiscardMsgs");
			MessageBox.warning(
				msg,
				{
					icon: MessageBox.Icon.WARNING,
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction == "YES")
							location.reload();
					}
				}
			);
		}

		//#endregion Review Wizard

   });
});