sap.ui.define([
	"./BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function(BaseController, Filter, JSONModel, MessageBox) {
	
	"use strict";
	
   return BaseController.extend("oem-partner.controller.Template", {  
	   
		//#region Init

   		onInit : function () {
			this.getRouter().getRoute("template").attachPatternMatched(this._onRouteMatched, this);
    	},

        _onRouteMatched : function(oEvent) {
			this._TemplateIndex = oEvent.getParameter("arguments").index;
			this._TemplatePath = "/Templates/" + this._TemplateIndex;
			this.getView().bindElement({
				path: "/Templates/-1", 
				model: "PartnerData"
			});

			if (this._templateView) {
				this._templateView.setProperty("/edited", false);
				this._templateView.setProperty("/isBind", false);
			}

			this.getServiceUnitCombos();

			if (this._oServiceUnitsDialog) {
				this._oServiceUnitsDialog = undefined;
			}
			if (this._oExtensionsDialog) {
				this._oExtensionsDialog = undefined;
			}
			if (this._oLicenseFileDialog) {
				this._oLicenseFileDialog = undefined;
			}
			if (this._oAssignLicensesDialog) {
				this._oAssignLicensesDialog = undefined;
			}
			if (this._oOperatorDialog) {
				this._oOperatorDialog = undefined;
			}
		},
		
		bindTemplateData : function () {
			if (!this._templateView.getProperty("/isBind")) {
				this._templateView.setProperty("/isBind", true);
				this._TemplatePath = "/Templates/" + this._TemplateIndex;
				this.getView().bindElement({
					path: this._TemplatePath, 
					model: "PartnerData"
				});
			}
		},

		initLocals : function() {
			this._bundle = this.getModel("i18n").getResourceBundle();
			this._countriesDataModel = this.getModel("countries");
			this._countriesDataModel.setSizeLimit(this._countriesDataModel.oData.Countries.length);
			this._countriesDataModel.updateBindings(true);
			this._PartnerDataModel = this.getModel("PartnerData");
			this._PartnerCombosModel = this.getModel("PartnerCombos");
			this._serviceUnitCombosModel = this.getModel("serviceUnitCombos");
			this._localSettingCombosModel = this.getModel("localSettingCombos");
			this._creationMethodModel = this.getModel("creationMethod");
			this._countriesDataModel = this.getModel("countries");

			// Model used to manipulate control states
			var oViewModel = new JSONModel({
				edited : false,
				isBind : false,
				extensions : false,
				authentication : false,
				creationMethod : false,
				backup : false,
				localSettings : false,
				chartOfAccount : false,
				systemLanguesge : false,
				licenseFile : false,
				licensePolicy : false,
				licenseType : false,
				addOperator : false
			});
			
			this.setModel(oViewModel, "templateView");
			this._templateView = this.getModel("templateView");
			this._PartnerDataModel.refresh();
		},

		//#endregion Init

		//#region Service Unit Combos Model

		getServiceUnitCombos : function () {
			if (!this._PartnerCombosModel) {
				this.initLocals();
			} else
			{
				this.serviceUnitEffect(false);
				this._templateView.refresh();
			}

			this.buildPackgesComboModel();
			this.clearValidations();
			let serviceUnitValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/HostingUnit_Id");
			if (!serviceUnitValue)
			{
				let emptyData = {};
				this._serviceUnitCombosModel.setData(emptyData);
				this.bindTemplateData();
				return;
			}
			let methodName = this.getConfModel().getProperty("/server/methodes/getServiceUnitCombos");
			methodName = methodName.replace("{0}", serviceUnitValue);
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'GET',
                dataType: 'json',
                success: function(result){
					this.setServiceUnitCombos(result);
                }.bind(this),
                error: function(XMLHttpRequest, textStatus, errorThrown) {
					jQuery.sap.log.error(textStatus);
                 }               
              });
		},

		buildPackgesComboModel : function () {
			this._PartnerDataModel.oData.PackagesList = JSON.parse(JSON.stringify(this._PartnerDataModel.oData.Packages));
			this._PartnerDataModel.oData.PackagesList.push({  
				"Id":0,
				"Name":"-No Package-",
				"Description":"-No Package-"
			 });
		},

		clearValidations : function () {
			this._templateView.setProperty("/templateNameVS", "None");
			this._templateView.setProperty("/countryVS", "None");
			this._templateView.setProperty("/serviceUnitVS", "None");
			this._templateView.setProperty("/backupPackageVS", "None");
			this._templateView.setProperty("/localSettingsVS", "None");
			this._templateView.setProperty("/chartOfAccountVS", "None");
			this._templateView.setProperty("/systemLanguesgeVS", "None");
			this._templateView.setProperty("/licenseFileVS", "None");
			this._templateView.setProperty("/licenseTypeVS", "None");
		},
		
		setServiceUnitCombos : function (data) {
			var a;
			data.localSettings = [{"Code": "", "Name": ""}];
			if (data.localizations.d)
			{
				for(var i = 0; i < data.localizations.d.results.length; i++) {
					a = data.localizations.d.results[i].split(",");
					data.localSettings.push({"Code": a[0], "Name": a[1]});
				}
			}
			data.systemLanguesge = [{"Code": -1, "Name": ""}];
			for(var i = 0; i < data.languages.d.results.length; i++) {
				a = data.languages.d.results[i].split(",");
				data.systemLanguesge.push({"Code": a[1], "Name": a[0]});
			}

			this._serviceUnitCombosModel.setData(data);	
			this._serviceUnitCombosModel.refresh();
			this.setViewAfterServiceUnit();

			this.onChangeCreationMethod();
			this.onChangeBackupPackage();
			this.setAssignLicensesModel();
			this.onSelectLicensePolicy();
			this.getLocalSettingCombos();
		},

		setViewAfterServiceUnit : function() {
			this.serviceUnitEffect(true);
			
			var creationMethod = {
				"CreationMethod": [
					{
						"Code": "Normal",
						"Name": "Normal"
					}
				]
			};

			if (!this._serviceUnitCombosModel.oData.servertype.d.ServerType) {
				return;
			}

			if (this._serviceUnitCombosModel.oData.servertype.d.ServerType.includes("MSSQL")) {
				this._templateView.oData.authentication = true;
				creationMethod.CreationMethod.push({
					"Code": "Backup",
					"Name": "Backup"
				},
				{
					"Code": "Package",
					"Name": "Solution Package"
				});
			} else {
				var version = this._PartnerCombosModel.oData.sldVersion.d.results[0].Value;
				if (!this.isLowerSldVersion(version, "1.10.SP00.PL11")) {
					creationMethod.CreationMethod.push({
						"Code": "Backup",
						"Name": "Backup"
					});
				}
			}

			this._templateView.refresh();

			this._creationMethodModel.setData(creationMethod);	
		},

		isLowerSldVersion : function(testVersion, baseVersion) {
			var aBaseVersion = baseVersion.split(".");
			var aTestVersion = testVersion.split(".");
			if (aTestVersion[0] < aBaseVersion[0]) {
				return true;
			} else if (aTestVersion[0] > aBaseVersion[0]) {
				return false;
			}
			if (aTestVersion[1] < aBaseVersion[1]) {
				return true;
			} else if (aTestVersion[1] > aBaseVersion[1]) {
				return false;
			}
			if (aTestVersion[2] < aBaseVersion[2]) {
				return true;
			} else if (aTestVersion[2] > aBaseVersion[2]) {
				return false;
			}
			if (aTestVersion[3] < aBaseVersion[3]) {
				return true;
			} else if (aTestVersion[3] > aBaseVersion[3]) {
				return false;
			}
			return false;
		},

		serviceUnitEffect : function(isFilled) {
			this._templateView.setProperty("/extensions", isFilled);
			this._templateView.setProperty("/creationMethod", isFilled);
			this._templateView.setProperty("/localSettings", isFilled);
			this._templateView.setProperty("/systemLanguesge", isFilled);
			this._templateView.setProperty("/licenseFile", isFilled);
			if (!isFilled) {
				this._templateView.setProperty("/authentication", false);
				this._templateView.setProperty("/backup", false);
				this._templateView.setProperty("/chartOfAccount", false);
				this._templateView.setProperty("/licensePolicy", false);
				this._templateView.setProperty("/licenseType", false);
				this._templateView.setProperty("/addOperator", false);
			}
		},

		//#endregion Service Unit Combos Model

		//#region Local Settings Combos Model

		getLocalSettingCombos : function () {
			if (!this._PartnerCombosModel)
				this.initLocals();

			let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
			let serviceUnitValue = oTemplate.HostingUnit_Id;
			if (!serviceUnitValue) {
				let emptyData = {};
				this._serviceUnitCombosModel.setData(emptyData);
				this.bindTemplateData();
				return;
			}

			if (oTemplate.CreationMethod === "Package") {
				return;
			}

			var localSettingsValue = this._PartnerDataModel.oData.Templates[this._TemplateIndex].LocalSettings;
			if (localSettingsValue) {
				this._templateView.setProperty("/chartOfAccount", true);
			}
			else {
				this._templateView.setProperty("/chartOfAccount", false);
				this.bindTemplateData();
				return;
			}

			let methodName = this.getConfModel().getProperty("/server/methodes/getLocalSettingCombos");
			methodName = methodName.replace("{0}", serviceUnitValue).replace("{1}", localSettingsValue);
			let reqURL = this.getServerURL() + methodName;
			$.ajax({
				url: reqURL,
				type: 'GET',
				dataType: 'json',
				success: function(result){
					this.handleGetLocalSettingCombosSuccess(result);
				}.bind(this),
				error: function(error) {
					this.handleGetLocalSettingCombosErrors(error);
					}.bind(this)               
				});
		},

		handleGetLocalSettingCombosSuccess : function (result) {
			if (this.isObject(result)) {
				this.setChartOfAccountsCombos(result);
				this.bindTemplateData();
			}
		},

		setChartOfAccountsCombos : function (data, isPreDefined) {
			data.chartOfAccounts = [{"Code": "", "Name": ""}];
			for(var i = 0; i < data.d.results.length; i++) {
				data.chartOfAccounts.push({"Code": data.d.results[i], "Name": data.d.results[i]});
			}
			let coaName = this._bundle.getText("COA_UserDefined");
			data.chartOfAccounts.push({"Code": "U", "Name": coaName});
			if (isPreDefined) {
				coaName = this._bundle.getText("COA_PreDefined");
				data.chartOfAccounts.push({"Code": "#", "Name": coaName});
			}
			delete data.d;
			this._localSettingCombosModel.setData(data);
		},
		
		handleGetLocalSettingCombosErrors : function (result) {

		},

		//#endregion Local Settings Combos Model

		//#region Service Unit Dialog

		handleSearch: function(oEvent, column) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(column, sap.ui.model.FilterOperator.Contains, sValue);
			var oBinding = oEvent.getSource().getBinding("items");
			if (oBinding) {
				oBinding.filter([oFilter]);
			}
		},
		
		openServiceUnitsDialog : function(oEvent) {
			if (!this._oServiceUnitsDialog) {
				this._oServiceUnitsDialog = sap.ui.xmlfragment("oem-partner.view.DialogServiceUnit", this);
			}
			this.getView().addDependent(this._oServiceUnitsDialog);
			this._oServiceUnitsDialog.open();
		},

		handleServiceUnitsSearch : function(oEvent) {
			this.handleSearch(oEvent, "Name");
		},

		handleServiceUnitsDialogConfirm : function (oEvent) {
			var aContexts = oEvent.getParameter("selectedContexts");
			var sPath = aContexts[0].sPath;
			var _index = sPath.split("/").slice(-1).pop();

			var SU_ID = this._PartnerCombosModel.getProperty("/serviceunits/d/results/" + _index + "/ID");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/HostingUnit_Id", SU_ID);
			var SU_Name = this._PartnerCombosModel.getProperty("/serviceunits/d/results/" + _index + "/Name");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/HostingUnit_Name", SU_Name);
			this.validateServiceUnit();
			this.setDataAfterServiceUnit();
			this._PartnerDataModel.refresh();
			this.serviceUnitEffect(false);
			this._templateView.setProperty("/edited", true);
			this._templateView.refresh();
			this.getServiceUnitCombos();
		},
		
		setDataAfterServiceUnit : function() {
			let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
			
			oTemplate.Templates_Extenstions = [];
			oTemplate.IsTrusted = false;
			oTemplate.Authentication = "sbo";
			oTemplate.CreationMethod = "Normal";
			oTemplate.LocalSettings = "";
			oTemplate.SystemLanguage = "";
			oTemplate.LicenseFile_Id = null;
			oTemplate.License_FileName = "";
			oTemplate.Templates_Operators = [];
			
			this._PartnerDataModel.setProperty(this._TemplatePath, oTemplate);
		},

		//#endregion Service Unit Dialog

		//#region Extensions Dialog

		setExtentionsDialogModel : function () {
			for(var i = 0; i < this._serviceUnitCombosModel.oData.extensions.d.results.length; i++) {
				var EId = this._serviceUnitCombosModel.oData.extensions.d.results[i].ID;
				if (this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Extenstions) {
					var index = this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Extenstions.findIndex(x => x.ExtensionDeployment_Id == EId);
					if (index >= 0) {
						this._serviceUnitCombosModel.oData.extensions.d.results[i].Extension.Selected = true;
					} else {
						this._serviceUnitCombosModel.oData.extensions.d.results[i].Extension.Selected = false;
					}
				}
			}
			this._serviceUnitCombosModel.refresh();
		},

		openExtensionsDialog : function(oEvent) {
			if (!this._oExtensionsDialog) {
				this._oExtensionsDialog = sap.ui.xmlfragment("oem-partner.view.DialogExtensions", this);
			}
			this._oExtensionsDialog.setMultiSelect(true);
			this.setExtentionsDialogModel();
			this.getView().addDependent(this._oExtensionsDialog);
			this._oExtensionsDialog.open();
		},

		handleExtensionsSearch : function(oEvent) {
			// this.handleSearch(oEvent, "Name");
		},
		
		onTokenUpdateExtensions : function (oEvent) {
			var sType = oEvent.getParameter("type");
			if (sType === "removed") {
				var iKey = parseInt(oEvent.getParameter("removedTokens")[0].getProperty("key"));
				var sPath = this._TemplatePath + "/Templates_Extenstions";
				var aData = this._PartnerDataModel.getProperty(sPath);
				for(var i = 0; i < aData.length; i++) {
					var idx;
					if (aData[i].ExtensionDeployment_Id === iKey) {
						idx = i;
					}	
				}
				aData.splice(idx, 1);
				this._PartnerDataModel.setProperty(sPath, aData);
				this._PartnerDataModel.refresh();
				this._templateView.setProperty("/edited", true);
				this._templateView.refresh();
			}	
		},

		handleExtensionsDialogConfirm : function (oEvent) {
			var aContexts = oEvent.getParameter("selectedContexts");
			var sPath, _index, _TemplateId, extensionData;
			_TemplateId = this._PartnerDataModel.getProperty(this._TemplatePath + "/id");
			var aTemplates_Extenstions = [];
			for(var i = 0; i < aContexts.length; i++) {
				sPath = aContexts[i].sPath;
				_index = sPath.split("/").slice(-1).pop();
				extensionData = this._serviceUnitCombosModel.getProperty("/extensions/d/results/" + _index);
				aTemplates_Extenstions.push({
					"TemplateId": _TemplateId,
					"ExtensionDeployment_Id": extensionData.ID,
         			"Extension_Id": extensionData.Extension.ID,
         			"Name": extensionData.Extension.Name,
         			"Version": extensionData.Extension.Version,
         			"Vendor": extensionData.Extension.Vendor,
         			"Type": extensionData.Extension.Type
				});
				
			}
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_Extenstions", aTemplates_Extenstions);
			this._PartnerDataModel.refresh();
			this._templateView.setProperty("/edited", true);
			this._templateView.refresh();
		},

		//#endregion Extensions Dialog

		//#region License File Dialog

		openLicenseFileDialog : function(oEvent) {
			if (!this._oLicenseFileDialog) {
				this._oLicenseFileDialog = sap.ui.xmlfragment("oem-partner.view.DialogLicenseFile", this);
			}
			this.getView().addDependent(this._oLicenseFileDialog);
			this._oLicenseFileDialog.open();
		},

		handleLicenseFileSearch : function(oEvent) {
			this.handleSearch(oEvent, "InstallationNumber");
		},

		handleLicenseFileDialogConfirm : function (oEvent) {
			var aContexts = oEvent.getParameter("selectedContexts");
			var sPath = aContexts[0].sPath;
			var _index = sPath.split("/").slice(-1).pop();

			var temp = this._PartnerCombosModel.oData.licenseFilesModules[_index].LicenseFile_Id;
			this._PartnerDataModel.oData.Templates[this._TemplateIndex].LicenseFile_Id = temp;
			temp = this._PartnerCombosModel.oData.licenseFilesModules[_index].InstallationNumber;
			this._PartnerDataModel.oData.Templates[this._TemplateIndex].License_FileName = temp;
			this._PartnerDataModel.oData.Templates[this._TemplateIndex].InstallationNumber = temp;
			this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Licenses = [];
			this.setAssignLicensesModel();
			this._templateView.setProperty("/edited", true);
			this.validateLicenseFile();
		},

		//#endregion License File Dialog

		//#region License Type Dialog
		
		setAssignLicensesModel : function() {
			this._PartnerCombosModel.oData.licensesModules = [];
			var LicenseFileId_PartnerModel = this._PartnerDataModel.oData.Templates[this._TemplateIndex].LicenseFile_Id;
			for(var i = 0; i < this._PartnerCombosModel.oData.licensemodules.length; i++) {
				var licenseFileID_ComboModel = this._PartnerCombosModel.oData.licensemodules[i].d.licenseFileID;
				if (licenseFileID_ComboModel == LicenseFileId_PartnerModel)
				{
					for(var j = 0; j < this._PartnerCombosModel.oData.licensemodules[i].d.results.length; j++) {
						this._PartnerCombosModel.oData.licensesModules.push({
							"Type": this._PartnerCombosModel.oData.licensemodules[i].d.results[j].Type,
							"Description": this._PartnerCombosModel.oData.licensemodules[i].d.results[j].Description,
							"Available": this._PartnerCombosModel.oData.licensemodules[i].d.results[j].Available});
					}
				}
			}
			this._PartnerDataModel.refresh();
			if (this._PartnerDataModel.oData.Templates[this._TemplateIndex].LicenseFile_Id) {
				this._templateView.oData.licensePolicy = true;
				this._templateView.oData.addOperator = true;
			} else {
				this._templateView.oData.licensePolicy = false;
				this._templateView.oData.addOperator = false;
			}
				
			this._templateView.refresh();
		},

		setAssignLicensesSelected : function(licenses) {
			for(var i = 0; i < this._PartnerCombosModel.oData.licensesModules.length; i++) {
				var type = this._PartnerCombosModel.oData.licensesModules[i].Type;
				var index = licenses.findIndex(x => x.LicenseType==type);
				if (index >= 0)
					this._PartnerCombosModel.oData.licensesModules[i].Selected = true;
				else
				this._PartnerCombosModel.oData.licensesModules[i].Selected = false;
			}
			this._PartnerCombosModel.refresh();
		},

		openLicenseTypeDialog : function(oEvent) {
			this._PartnerDataModel.oData.Temp_Status = "dialogLicenseType";
			this.openAssignLicensesDialog(this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Licenses);
		},

		openOperatorsLicensesDialog : function(oEvent) {
			var aContexts = oEvent.getSource().getParent().getBindingContext("PartnerData");
			var sPath = aContexts.sPath;
			var _index = sPath.split("/").slice(-1).pop();
			var _User_Id = this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_index].User_Id;
			this._PartnerDataModel.oData.Temp_Status = "dialogLicenseOperator," + _index + "," + _User_Id;
			this.openAssignLicensesDialog(this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_index].Operators_licenses);
		},

		openAssignLicensesDialog : function(aLicenses) {
			if (!aLicenses) {
				aLicenses = [];
			}
			this.setAssignLicensesSelected(aLicenses);
			
			if (!this._oAssignLicensesDialog) {
				this._oAssignLicensesDialog = sap.ui.xmlfragment("oem-partner.view.DialogAssignLicenses", this);
			}

			this._oAssignLicensesDialog.setMultiSelect(true);
			this.getView().addDependent(this._oAssignLicensesDialog);
			this._oAssignLicensesDialog.open();
		},

		handleAssignLicensesSearch  : function(oEvent) {
			this.handleSearch(oEvent, "Description");
		},

		onTokenUpdateLicenseType : function (oEvent) {
			var sType = oEvent.getParameter("type");
			if (sType === "removed") {
				var sKey = oEvent.getParameter("removedTokens")[0].getProperty("key");
				var sPath = this._TemplatePath + "/Templates_Licenses";
				var aData = this._PartnerDataModel.getProperty(sPath);
				for(var i = 0; i < aData.length; i++) {
					var idx;
					if (aData[i].LicenseType === sKey) {
						idx = i;
					}	
				}
				aData.splice(idx, 1);
				this._PartnerDataModel.setProperty(sPath, aData);
				this._templateView.setProperty("/edited", true);
				this._templateView.refresh();
			}	
		},

		onTokenUpdateOperatorsLicenseType : function (oEvent) {
			var sType = oEvent.getParameter("type");
			var aContexts = oEvent.getSource().getParent().getBindingContext("PartnerData");
			var sPath = aContexts.sPath;
			var _indexOperator = sPath.split("/").slice(-1).pop();
			if (sType === "removed") {
				var sKey = oEvent.getParameter("removedTokens")[0].getProperty("key");
				var sPath = this._TemplatePath + "/Templates_Operators/" + _indexOperator + "/Operators_licenses";
				var aData = this._PartnerDataModel.getProperty(sPath);
				for(var i = 0; i < aData.length; i++) {
					var idx;
					if (aData[i].LicenseType === sKey) {
						idx = i;
					}	
				}
				aData.splice(idx, 1);
				this._PartnerDataModel.setProperty(sPath, aData);
				this._templateView.setProperty("/edited", true);
				this._templateView.refresh();
			}	
		},

		handleAssignLicensesDialogConfirm : function (oEvent) {
			var aContexts = oEvent.getParameter("selectedContexts");
			var sPath, _indexOperator, _indexModule, _LicenseType;
			var _TemplateId = this._PartnerDataModel.oData.Templates[this._TemplateIndex].id;
			var _User_Id;
			if (this._PartnerDataModel.oData.Temp_Status == "dialogLicenseType") {
				this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Licenses = [];
			}
			else if (this._PartnerDataModel.oData.Temp_Status.includes("dialogLicenseOperator")) {
				_indexOperator = this._PartnerDataModel.oData.Temp_Status.split(",")[1];
				_User_Id = parseInt(this._PartnerDataModel.oData.Temp_Status.split(",")[2]);
				this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_indexOperator].Operators_licenses = [];
			}
			for(var i = 0; i < aContexts.length; i++) {
				sPath = aContexts[i].sPath;
				_indexModule = sPath.split("/").slice(-1).pop();
				_LicenseType = this._PartnerCombosModel.oData.licensesModules[_indexModule].Type;
				if (_User_Id) {
					this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_indexOperator].Operators_licenses.push({
						"TemplateId": _TemplateId,
						"User_Id": _User_Id,
						"LicenseType": _LicenseType
					});
				} else {
					this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Licenses.push({
						"TemplateId": _TemplateId,
						"LicenseType": _LicenseType
					});
				}
			}
			this._PartnerDataModel.refresh();
			if (this._PartnerDataModel.oData.Temp_Status == "dialogLicenseType") {
				this.validateLicenseType();
			}
			else if (this._PartnerDataModel.oData.Temp_Status.includes("dialogLicenseOperator")) {

			}
			this._templateView.setProperty("/edited", true);
			this._templateView.refresh();
		},

		//#endregion License Type Dialog

		//#region Operator Dialog

		setOperatorsModel : function() {
			let aOperatorsModel = JSON.parse(JSON.stringify(this._PartnerCombosModel.getProperty("/operators/d/results")));
			let aTemplatesOperators = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Operators");
			let indexFound;
			for(let i = 0; i < aTemplatesOperators.length; i++) {
				indexFound = aOperatorsModel.findIndex(x => x.SystemUsername==aTemplatesOperators[i].SystemUser);
				if (indexFound >= 0) {
					aOperatorsModel.splice(indexFound, 1);
				}
			}
			this._PartnerCombosModel.setProperty("/operatorsModel", aOperatorsModel);
		},

		onAddOperator : function() {
			if (!this._oOperatorDialog) {
				this._oOperatorDialog = sap.ui.xmlfragment("oem-partner.view.DialogOperator", this);
			}
			this.setOperatorsModel();
			this.getView().addDependent(this._oOperatorDialog);
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oOperatorDialog);
			this._oOperatorDialog.open();
		},

		handleOpertorDialogConfirm : function (oEvent) {
			let aContexts = oEvent.getParameter("selectedContexts");
			let sPath = aContexts[0].sPath;
			let _index = sPath.split("/").slice(-1).pop();
			let aTemplates_Operators = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Operators");			

			if (!aTemplates_Operators)
				aTemplates_Operators = [];
				
			let _TemplateId = this._PartnerDataModel.getProperty(this._TemplatePath + "/id");
			let oOperators = this._PartnerCombosModel.getProperty("/operatorsModel/" + _index);
			let _User_Id = oOperators.ID;
			let _SystemUser = oOperators.SystemUsername;
			let _SuperUser = oOperators.IsSuperSBOUser;
			let _PowerUser = oOperators.IsPowerSBOUser;
			let _Status = oOperators.Status;

			aTemplates_Operators.push({
				"TemplateId": _TemplateId,
				"User_Id": _User_Id,
				"UserCode": _SystemUser,
				"SystemUser": _SystemUser,
				"SuperUser": _SuperUser,
				"PowerUser": _PowerUser,
				"Status": _Status
			});
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_Operators", aTemplates_Operators);
			this._templateView.setProperty("/edited", true);
		},

		//#endregion Operator Dialog

		//#region SolutionPackage Model

		getSolutionPackageData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/getSolutionPackageContent");
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'POST',
				dataType: 'json',
				contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data),
                success: function(result){
					this.handleGetSolutionPackageDataSuccess(result);
                }.bind(this),
                error: function(error) {
					this.handleGetSolutionPackageDataErrors(error);
                 }.bind(this)               
              });
		},
		
		handleGetSolutionPackageDataSuccess : function (result) {
			this.setChartOfAccountsCombos(result.coa, true);
			this._templateView.setProperty("/chartOfAccount", true);

			if (this._templateView.getProperty("/isBind")) {
				let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
				oTemplate.LocalSettings = result.localization;
				oTemplate.SystemLanguage = result.baselanguage;
				oTemplate.ChartOfAccount = "#";
				this._PartnerDataModel.setProperty(this._TemplatePath, oTemplate);
				this.setLocalSettingsName();
				this.setSystemLanguageName();
			} else {
				this.bindTemplateData();
			}
			
			this.validateLocalSettings();
			this.validateSystemLanguesge();
		},

		handleGetSolutionPackageDataErrors : function (result) {

		},

		//#endregion SolutionPackage Model

		//#region Change Events

		onLiveChangeTemplateName : function (oEvent) {
			this._templateView.setProperty("/edited", true);
			this.validateTemplateName(oEvent);
		},

		onChangeCountry : function (oEvent) {
			this._templateView.setProperty("/edited", true);
			this.validateCountry(oEvent);
		},

		onChangeIndustryPackage : function (oEvent) {
			this._templateView.setProperty("/edited", true);
			let P_Id = this._PartnerDataModel.getProperty(this._TemplatePath + "/IndPackageId");
			let P_index = this._PartnerDataModel.getProperty("/Packages").findIndex(x => x.Id==P_Id);
			if (P_index >= 0) {
				let P_Name = this._PartnerDataModel.getProperty("/Packages/" + P_index + "/Name");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/IndPackageName", P_Name);
			} else {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/IndPackageName", "");
			}
		},

		onChangeAuthentication : function (oEvent) {
			if (oEvent) {
				this._templateView.setProperty("/edited", true);
			}
		},

		onChangeCreationMethod : function(oEvent) {
			if (oEvent) {
				this._templateView.setProperty("/edited", true);
			
				this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettings", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettingsName", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/ChartOfAccount", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/SystemLanguage", null);
				this._PartnerDataModel.setProperty(this._TemplatePath + "/SystemLanguageName", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackage", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackageName", "");
			}
			let oSelectedKey = this._PartnerDataModel.getProperty(this._TemplatePath + "/CreationMethod");
			if ((oSelectedKey == "Package") || (oSelectedKey == "Backup"))
			{
				this._templateView.setProperty("/backup", true);
				this._templateView.setProperty("/localSettings", false);
				this._templateView.setProperty("/chartOfAccount", false);
				this._templateView.setProperty("/systemLanguesge", false);
			}
			else
			{
				this._templateView.setProperty("/backup", false);
				this._templateView.setProperty("/localSettings", true);
				this._templateView.setProperty("/chartOfAccount", true);
				this._templateView.setProperty("/systemLanguesge", true);
			}
			
			let aBackupPackage;
			let aBackupPath;
			switch(oSelectedKey) {
				case "Backup":
					aBackupPath = this._serviceUnitCombosModel.getProperty("/backupPath");
					aBackupPackage = [{"Code": "", "Name": ""}];
					for(var i = 0; i < aBackupPath.length; i++) {
						aBackupPackage.push({
							"Code": aBackupPath[i].Path, 
							"Name": aBackupPath[i].Name});
					}
					break;
				case "Package":
					aBackupPath = this._serviceUnitCombosModel.getProperty("/packagePath");
					aBackupPackage = [{"Code": "", "Name": ""}];
					for(var i = 0; i < aBackupPath.length; i++) {
						aBackupPackage.push({
							"Code": aBackupPath[i].Path, 
							"Name": aBackupPath[i].FileName});
					}
					break;
				default:
					aBackupPackage = [];
			}
			this._serviceUnitCombosModel.setProperty("/backupPackage", aBackupPackage);

			this.validateBackupPackage();
			this.validateLocalSettings();
			this.validateChartOfAccount();
			this.validateSystemLanguesge();
		},

		onChangeBackupPackage : function (oEvent) {
			if (oEvent) {
				this._templateView.setProperty("/edited", true);
				this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettings", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettingsName", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/ChartOfAccount", "");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/SystemLanguage", null);
			}

			this.validateBackupPackage(oEvent);

			// Populate BackupPackageName key after BackupPackage key was changed.
			let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
			let aBackupPath = this._serviceUnitCombosModel.getProperty("/backupPackage");
			let index = aBackupPath.findIndex(x => x.Code==oTemplate.BackupPackage);
			if (index >= 0) {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackageName", aBackupPath[index].Name);
			} else {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackageName", "");
			}

			if ((oTemplate.CreationMethod == "Package") && 
				(oTemplate.BackupPackage)) {
                this.getSolutionPackageData({
					"serviceunit" : oTemplate.HostingUnit_Id,
					"packagePath" : oTemplate.BackupPackage
				});
            }
		},

		// Populate LocalSettingsName key after LocalSettings key was changed.
		setLocalSettingsName : function () {
			let code = this._PartnerDataModel.getProperty(this._TemplatePath + "/LocalSettings");
			let arr = this._serviceUnitCombosModel.getProperty("/localSettings");
			let index = arr.findIndex(x => x.Code==code);
			if (index >= 0) {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettingsName", arr[index].Name);
			} else {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettingsName", "");
			}
		},

		onChangeLocalSettings : function(oEvent) {
			this._templateView.setProperty("/edited", true);

			this.validateLocalSettings();

			this.setLocalSettingsName();

			this.getLocalSettingCombos();

			this._PartnerDataModel.setProperty(this._TemplatePath + "/ChartOfAccount", "");
		},

		onChangeChartOfAccount : function (oEvent) {
			this._templateView.setProperty("/edited", true);
			this.validateChartOfAccount(oEvent);
		},

		// Populate SystemLanguageName key after SystemLanguage key was changed.
		setSystemLanguageName : function () {
			let code = this._PartnerDataModel.getProperty(this._TemplatePath + "/SystemLanguage");
			let arr = this._serviceUnitCombosModel.getProperty("/systemLanguesge");
			let index = arr.findIndex(x => x.Code==code);
			if (index >= 0) {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/SystemLanguageName", arr[index].Name);
			} else {
				this._PartnerDataModel.setProperty(this._TemplatePath + "/SystemLanguageName", "");
			}
		},

		onChangeSystemLanguesge : function (oEvent) {
			this._templateView.setProperty("/edited", true);
			this.validateSystemLanguesge(oEvent);
			this.setSystemLanguageName();
		},

		onSelectLicensePolicy : function(oEvent) {
			if (oEvent) {
				this._templateView.setProperty("/edited", true);
			}
			if (this._PartnerDataModel.getProperty(this._TemplatePath + "/IsSameLicense")) {
				this._templateView.setProperty("/licenseType", true);
			} else {
				this._templateView.setProperty("/licenseType", false);
				this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_Licenses", [])
			}
			this.validateLicenseType();
		},

		onDeleteOperator : function(oEvent) {
			let msg = this._bundle.getText("OperatorDeleteMsgs");
			let idx = oEvent.getParameter('listItem').getBindingContext("PartnerData").getPath().split("/")[4];
			MessageBox.warning(
				msg,
				{
					icon: MessageBox.Icon.WARNING,
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction == "YES") {
							let aTemplatesOperators = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Operators");
							aTemplatesOperators.splice(idx, 1);
							this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_Operators", aTemplatesOperators);
							this._templateView.setProperty("/edited", true);
						}
					}.bind(this)
				}
			);
		},

		onSelectSuperUser : function(oEvent) {
			let isSuperUser = oEvent.getParameter("selected");
			let aContexts = oEvent.getSource().getParent().getBindingContext("PartnerData");
			let sPath = aContexts.sPath;
			let _index = sPath.split("/").slice(-1).pop();
			this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_index].PowerUser_enabled = !isSuperUser;
			if (isSuperUser) {
				this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_index].PowerUser = true;
			}
			this._PartnerDataModel.refresh();
			this._templateView.setProperty("/edited", true);
		},

		onSelectPowerUser : function(oEvent) {
			this._templateView.setProperty("/edited", true);
			this._templateView.refresh();
		},

		//#endregion Change Events
		
		//#region Validate Inputs

        validateTemplateName : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
				this._templateView.setProperty("/edited", true);
			} else {
				sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/Name");
			}
            if (!sValue) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/templateNameVS", "Error");
				}
            } else {
				this._templateView.setProperty("/templateNameVS", "None");
            }
        },

		validateCountry : function (oEvent) {
            let sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/Country_Code");
            if ((!sValue) || (sValue == "XX")) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/countryVS", "Error");
				}
            } else {
				this._templateView.setProperty("/countryVS", "None");
			}
			
			let C_index = this._countriesDataModel.getProperty("/Countries").findIndex(x => x.Code==sValue);
			if (C_index >= 0) {
				var C_Name = this._countriesDataModel.getProperty("/Countries/" + C_index + "/Name");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/Country_Name", C_Name);
			}
		},

		validateServiceUnit : function () {
			let sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/HostingUnit_Name");
            if (!sValue) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/serviceUnitVS", "Error");
				}
            } else {
				this._templateView.setProperty("/serviceUnitVS", "None");
            }
		},

		validateBackupPackage : function (oEvent) {
			let isRequired = ["Backup", "Package"].includes(this._PartnerDataModel.getProperty(this._TemplatePath + "/CreationMethod"));
			let sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/BackupPackage");
            if ((isRequired) && (!sValue)) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/backupPackageVS", "Error");
				}
            } else {
				this._templateView.setProperty("/backupPackageVS", "None");
            }
		},

		isLocalParametersRequired : function () {
			return ["Normal", "Package"].includes(this._PartnerDataModel.getProperty(this._TemplatePath + "/CreationMethod"));
		},

		validateLocalSettings : function () {
            let sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/LocalSettings");
            if ((this.isLocalParametersRequired()) && (!sValue)) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/localSettingsVS", "Error");
				}
            } else {
				this._templateView.setProperty("/localSettingsVS", "None");
            }
		},

		validateChartOfAccount : function (oEvent) {
			let sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/ChartOfAccount");
			this._PartnerDataModel.oData.Templates[this._TemplateIndex].ChartOfAccount;
            if ((this.isLocalParametersRequired()) && (!sValue)) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/chartOfAccountVS", "Error");
				}
            } else {
				this._templateView.setProperty("/chartOfAccountVS", "None");
            }
		},

		validateSystemLanguesge : function () {
            let sValue = this._PartnerDataModel.getProperty(this._TemplatePath + "/SystemLanguage");
            if ((this.isLocalParametersRequired()) && ((!sValue) || (sValue == -1))) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/systemLanguesgeVS", "Error");
				}
            } else {
				this._templateView.setProperty("/systemLanguesgeVS", "None");
            }
		},

		validateLicenseFile : function () {
			let sValue = this._PartnerDataModel.oData.Templates[this._TemplateIndex].License_FileName;
            if (!sValue) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/licenseFileVS", "Error");
				}
            } else {
				this._templateView.setProperty("/licenseFileVS", "None");
            }
		},

		validateLicenseType : function () {
			let isRequired = this._PartnerDataModel.getProperty(this._TemplatePath + "/IsSameLicense");
			let Templates_Licenses = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Licenses");
			let isValue = Templates_Licenses && (Templates_Licenses.length > 0);
            if ((isRequired) && (!isValue)) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/licenseTypeVS", "Error");
				}
            } else {
				this._templateView.setProperty("/licenseTypeVS", "None");
            }
		},

		isValidation : function() {
			this._templateView.setProperty("/isSaving", true);
			this.validateTemplateName();
			this.validateCountry();
			this.validateServiceUnit();
			this.validateBackupPackage();
			this.validateLocalSettings();
			this.validateChartOfAccount();
			this.validateSystemLanguesge();
			this.validateLicenseFile();
			this.validateLicenseType();
			this._templateView.setProperty("/isSaving", false);
			return ((this._templateView.getProperty("/templateNameVS") === "None") &&
				(this._templateView.getProperty("/countryVS") === "None") &&
				(this._templateView.getProperty("/serviceUnitVS") === "None") &&
				(this._templateView.getProperty("/backupPackageVS") === "None") &&
				(this._templateView.getProperty("/localSettingsVS") === "None") &&
				(this._templateView.getProperty("/chartOfAccountVS") === "None") &&
				(this._templateView.getProperty("/systemLanguesgeVS") === "None") &&
				(this._templateView.getProperty("/licenseFileVS") === "None") &&
				(this._templateView.getProperty("/licenseTypeVS") === "None"))
        },

		isDuplicateCountryAndPackage () {
			let Country_Code = this._PartnerDataModel.getProperty(this._TemplatePath + "/Country_Code");
			if ((!Country_Code) || (Country_Code == "XX")) {
				return false;
			}
			let P_Id = this._PartnerDataModel.getProperty(this._TemplatePath + "/IndPackageId");
			let aTemplates = this._PartnerDataModel.getProperty("/Templates");
			let cCountry_Code, cP_Id;
			for(let i = 0; i < aTemplates.length; i++) {
				if (i == this._TemplateIndex) {
					continue;
				}
				cCountry_Code = aTemplates[i].Country_Code;
				cP_Id = aTemplates[i].IndPackageId;
				if ((Country_Code == cCountry_Code) && (P_Id == cP_Id))
				{
					return true;
				}
			}
			return false;
		},

		//#endregion Validate Inputs

		//#region Navigate

		onSave : function() {
			if (!this.isValidation()) {
                var msg = this._bundle.getText("TemplateValidationError");
                MessageBox.error(msg);
                return;
			}
			if (this.isDuplicateCountryAndPackage()) {
                var msg = this._bundle.getText("TemplateDuplucateCountryPackageError");
                MessageBox.error(msg);
                return;
            }
			this._PartnerDataModel.oData.Temp_Status = "saveTemplate"
			this.getRouter().navTo("partner", {}, true);
		},
		
        onCancel : function() {
			this.onNavBack();
        },
				
		onNavBack : function() {
			if (!this._templateView.getProperty("/edited")) {
				this.navBack();
				return;
			}

			var msg = this._bundle.getText("TemplateDiscardMsgs");
			MessageBox.warning(
				msg,
				{
					icon: MessageBox.Icon.WARNING,
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction == "YES") {
							this.navBack();
						}
					}.bind(this)
				}
			);
		},

		navBack : function() {
			if (this._PartnerDataModel.oData.Temp_Status == "newTemplate") {
				this._PartnerDataModel.oData.Templates.splice(this._TemplateIndex);
				this._PartnerDataModel.oData.Temp_Status = "view";
			} else {
				this._PartnerDataModel.oData.Temp_Status = "cancelTemplate"
			}
			this.getRouter().navTo("partner", {}, true);
		}

		//#endregion Navigate

   });
});