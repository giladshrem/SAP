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
				this._templateView.setProperty("/TemplateServiceUnits", "");
			}

			this.setServiceUnitData();
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
			this._localSettingCombosModel = this.getModel("localSettingCombos");
			this._creationMethodModel = this.getModel("creationMethod");
			this._countriesDataModel = this.getModel("countries");

			// Model used to manipulate control states
			let oViewModel = this.getTemplateEmptyModel();
			this.setModel(oViewModel, "templateView");
			this._templateView = this.getModel("templateView");
		},

		getTemplateEmptyModel : function () {
			let oViewModel = new JSONModel({
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
				addOperator : false,
				TemplateServiceUnits : "",
				DialogServiceUnits : {
					ServerType : "SQL",
					UseLoadBalancingEnabled : false,
					LoadBalancingEnabled : "N",
					AlgorithmEnabled : false,
					Algorithm : "L",
					AlgorithmText : "",
					ServiceUnitsTable : [],
					MoveUpEnabled : false,
					MoveDownEnabled : false,
					SubmitEnabled : false,
					ServiceUnitsSelected: []
				},
				DialogExtentions : {
					ExtentionsTable : []
				},
				DialogBackups : {
					BackupsTable : []
				},
				DialogPackages : {
					PackagesTable : []
				}
			});
			return oViewModel;
		},

		//#endregion Init

		//#region Service Unit Combos

		setServiceUnitData : function () {
			if (!this._PartnerCombosModel) {
				this.initLocals();
			} else	{
				this.serviceUnitEffect(false);
			}

			this.buildPackgesComboModel();
			this.clearValidations();
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			if ((!aTemplates_ServiceUnits) || (aTemplates_ServiceUnits.length === 0))
			{
				this.bindTemplateData();
				return;
			}
			let aServiceunitsParams = this.getServiceUnitParams();
			if (aServiceunitsParams) {
				this.setServiceUnitParams(aServiceunitsParams);
			}
		},

		getServiceUnitParams : function () {
			let aServiceUnitParams;
			let oServiceunitsParams = this._PartnerCombosModel.getProperty("/allparams");
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			if ((aTemplates_ServiceUnits) || (aTemplates_ServiceUnits.length > 0))
			{
				let SU_ID = aTemplates_ServiceUnits[0].HostingUnit_Id;
				let indexServiceUnitParams = oServiceunitsParams.findIndex(x => x.serviceunitID === SU_ID);
				if (indexServiceUnitParams >= 0) {
					aServiceUnitParams = oServiceunitsParams[indexServiceUnitParams];
				}
			}
			return aServiceUnitParams;
		},

		buildPackgesComboModel : function () {
			let aPackages = JSON.parse(JSON.stringify(this._PartnerDataModel.getProperty("/Packages")));
			aPackages.push({  
				"Id":0,
				"Name":"-No Package-",
				"Description":"-No Package-"
			 });
			 this._PartnerDataModel.setProperty("/PackagesList", aPackages);
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
		
		setServiceUnitParams : function (data) {
			let a;
			let aLocalSettings = [{"Code": "", "Name": ""}];
			if (data.localizations.d)
			{
				for(let i = 0; i < data.localizations.d.results.length; i++) {
					a = data.localizations.d.results[i].split(",");
					aLocalSettings.push({"Code": a[0], "Name": a[1]});
				}
			}
			this._PartnerCombosModel.setProperty("/localSettings", aLocalSettings);

			let aSystemLanguesge = [{"Code": -1, "Name": ""}];
			for(let i = 0; i < data.languages.d.results.length; i++) {
				a = data.languages.d.results[i].split(",");
				aSystemLanguesge.push({"Code": a[1], "Name": a[0]});
			}
			this._PartnerCombosModel.setProperty("/systemLanguesge", aSystemLanguesge);

			this.setViewAfterServiceUnit();
			this.onChangeCreationMethod();
			this.validateBackupPackage();
			this.setBackupPackageName();
			this.tryGetSolutionPackageData();
			this.setAssignLicensesModel();
			this.onSelectLicensePolicy();
			this.getLocalSettingCombos();
			this.toggleServiceLayer();
		},

		setViewAfterServiceUnit : function() {
			this.setServiceUnitsInput();
			this.serviceUnitEffect(true);
			
			let creationMethod = {
				"CreationMethod": [{
					"Code": "Normal",
					"Name": "Normal"
				}]
			};
			let sServerType = this._PartnerDataModel.getProperty(this._TemplatePath + "/ServerType"); 
			if (!sServerType) {
				return;
			}

			if (sServerType.includes("SQL")) {
				this._templateView.setProperty("/authentication", true);
				creationMethod.CreationMethod.push({
					"Code": "Backup",
					"Name": "Backup"
				},
				{
					"Code": "Package",
					"Name": "Solution Package"
				});
			} else {
				let version = this._PartnerCombosModel.getProperty("/sldVersion/d/results/0/Value");
				if (!this.isLowerSldVersion(version, "1.10.SP00.PL11")) {
					creationMethod.CreationMethod.push({
						"Code": "Backup",
						"Name": "Backup"
					});
				}
			}

			this._creationMethodModel.setData(creationMethod);
		},

		isLowerSldVersion : function(testVersion, baseVersion) {
			let aBaseVersion = baseVersion.split(".");
			let aTestVersion = testVersion.split(".");
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

		//#endregion Service Unit Combos

		//#region Local Settings Combos Model

		getLocalSettingCombos : function () {
			if (!this._PartnerCombosModel)
				this.initLocals();

			let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
			let aTemplates_ServiceUnits = oTemplate.Templates_ServiceUnits;
			if ((!aTemplates_ServiceUnits) || (aTemplates_ServiceUnits.length === 0)) {
				this.bindTemplateData();
				return;
			}
			let serviceUnitValue = aTemplates_ServiceUnits[0].HostingUnit_Id;
			if (oTemplate.CreationMethod === "Package") {
				return;
			}

			let localSettingsValue = this._PartnerDataModel.oData.Templates[this._TemplateIndex].LocalSettings;
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
				xhrFields: {
                    withCredentials: true
                },
				dataType: 'json',
				success: function(result){
					this.handleGetLocalSettingCombosSuccess(result);
				}.bind(this),
				error: function(error) {
					this.handleGetLocalSettingCombosErrors(error);
					}.bind(this)               
				});
		},

		handleGetLocalSettingCombosSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setLocalSettingCombos(data);
            }
		},
		
		setLocalSettingCombos : function (result) {
			if (this.isObject(result)) {
				this.setChartOfAccountsCombos(result);
				this.bindTemplateData();
			}
		},

		setChartOfAccountsCombos : function (data, isPreDefined) {
			data.chartOfAccounts = [{"Code": "", "Name": ""}];
			for(let i = 0; i < data.d.results.length; i++) {
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
		
		setServiceUnitsTablesModel : function () {
			let ServerType = this._templateView.getProperty("/DialogServiceUnits/ServerType");
			let LoadBalancingEnabled = this._templateView.getProperty("/DialogServiceUnits/LoadBalancingEnabled");
			if (LoadBalancingEnabled === "Y") {
				this._templateView.setProperty("/DialogServiceUnits/AlgorithmEnabled", true);
			} else {
				this._templateView.setProperty("/DialogServiceUnits/AlgorithmEnabled", false);
			}
			let oServiceunits = this._PartnerCombosModel.getProperty("/serviceunits/d/results");
			let oServiceunitsParams = this._PartnerCombosModel.getProperty("/allparams");
			let oTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let oServiceUnitsTable = [];
			let oServiceUnitsSelected = [];
			let indexServiceUnitParams, indexTemplates_ServiceUnits, SU_ID, SU_ServerType, SU_NumberOfTenants, bSelected, iOrder, iMaxTenants;
			for(let i = 0; i < oServiceunits.length; i++) {
				SU_ID = oServiceunits[i].ID;
				indexServiceUnitParams = oServiceunitsParams.findIndex(x => x.serviceunitID === SU_ID);
				if (indexServiceUnitParams >= 0) {
					SU_ServerType = oServiceunitsParams[indexServiceUnitParams].servertype.d.ServerType;
					if (!SU_ServerType.includes(ServerType)) {
						continue;
					}
					SU_NumberOfTenants = oServiceunitsParams[indexServiceUnitParams].numberOfTenants;
				} else {
					continue;
				}
				indexTemplates_ServiceUnits = -1;
				if (oTemplates_ServiceUnits) {
					indexTemplates_ServiceUnits = oTemplates_ServiceUnits.findIndex(x => x.HostingUnit_Id === SU_ID);
				}
				if (indexTemplates_ServiceUnits >= 0) {
					bSelected = true;
					iOrder = oTemplates_ServiceUnits[indexTemplates_ServiceUnits].Order;
					iMaxTenants = oTemplates_ServiceUnits[indexTemplates_ServiceUnits].MaxTenants;
				} else {
					bSelected = false;
					iOrder = "9999";
					iMaxTenants = 9999;
				}
				oServiceUnitsTable.push({
					"Selected" : bSelected,
					"ID" : oServiceunits[i].ID,
					"Name" : oServiceunits[i].Name,
					"Purpose" : oServiceunits[i].Purpose,
					"Version" : oServiceunits[i].Version,
					"Status" : oServiceunits[i].Status,
					"NumTenants" : SU_NumberOfTenants
				});
				if (bSelected) {
					oServiceUnitsSelected.push({
						"ID" : oServiceunits[i].ID,
						"Name" : oServiceunits[i].Name,
						"Version" : oServiceunits[i].Version,
						"NumTenants" : SU_NumberOfTenants,
						"Order": iOrder,
						"MaxTenants" : iMaxTenants
					});
				}
			}
			
			if ((oServiceUnitsTable.length === 1) && (oServiceUnitsSelected.length != 1)) {
				this._templateView.setProperty("/DialogServiceUnits/UseLoadBalancingEnabled", false);
				oServiceUnitsTable[0].Selected = true;
				oServiceUnitsSelected = [];
				oServiceUnitsSelected.push({
					"ID" : oServiceUnitsTable[0].ID,
					"Name" : oServiceUnitsTable[0].Name,
					"Version" : oServiceUnitsTable[0].Version,
					"NumTenants" : oServiceUnitsTable[0].NumTenants,
					"Order": 1,
					"MaxTenants" : 100
				});
			} else if (oServiceUnitsTable.length > 1) {
				this._templateView.setProperty("/DialogServiceUnits/UseLoadBalancingEnabled", true);
			}
			this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsTable", oServiceUnitsTable);
			this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsSelected", oServiceUnitsSelected);
			this.setSubmitButton();
		},

		setServiceUnitsDialogModel : function () {
			let ServerType = this._PartnerDataModel.getProperty(this._TemplatePath + "/ServerType");
			if (ServerType != "HANA") {
				ServerType = "SQL";
			}
			this._templateView.setProperty("/DialogServiceUnits/ServerType", ServerType);
			let LoadBalancing = this._PartnerDataModel.getProperty(this._TemplatePath + "/LoadBalancing");
			if (LoadBalancing) {
				this._templateView.setProperty("/DialogServiceUnits/LoadBalancingEnabled", "Y");
			} else {
				this._templateView.setProperty("/DialogServiceUnits/LoadBalancingEnabled", "N");
			}
			this.setServiceUnitsTablesModel();
			this.onChangeUseLoadBalancing();
			let Algorithm = this._PartnerDataModel.getProperty(this._TemplatePath + "/Algorithm");
			if (!Algorithm) {
				Algorithm = "L";
			}
			this._templateView.setProperty("/DialogServiceUnits/Algorithm", Algorithm);
			this.setAlgoruthmText();
			this._templateView.setProperty("/DialogServiceUnits/SubmitEnabled", false);
		},

		setAlgoruthmText : function () {
			let Algorithm = this._templateView.getProperty("/DialogServiceUnits/Algorithm");
			switch(Algorithm) {
				case "L":
					this._templateView.setProperty("/DialogServiceUnits/AlgorithmText", this._bundle.getText("SUD_LeastTenantsAlgorithmText"));
				break;
				case "R":
					this._templateView.setProperty("/DialogServiceUnits/AlgorithmText", this._bundle.getText("SUD_RoundRobinAlgorithmText"));
				break;
				default:
					this._templateView.setProperty("/DialogServiceUnits/AlgorithmText", "");
				break;
			}
		},

		openServiceUnitsDialog : function(oEvent) {
			if (this._oServiceUnitsDialog) {
				this._oServiceUnitsDialog.destroy();	
			}
			this._oServiceUnitsDialog = sap.ui.xmlfragment("idFragmentDialogServiceUnit", "oem-partner.view.DialogServiceUnit", this);
			this.setServiceUnitsDialogModel();
			this.getView().addDependent(this._oServiceUnitsDialog);
			this._oServiceUnitsDialog.open();
		},

		setSubmitButton : function() {
			let LoadBalancingEnabled = this._templateView.getProperty("/DialogServiceUnits/LoadBalancingEnabled");
			let aSelectedServiceUnits = sap.ui.core.Fragment.byId("idFragmentDialogServiceUnit", "idServiceUnitsTable").getSelectedItems();
			let SubmitEnabled = ((!(LoadBalancingEnabled === "Y") && (aSelectedServiceUnits.length === 1)) ||
				((LoadBalancingEnabled === "Y") && (aSelectedServiceUnits.length > 1)));
			this._templateView.setProperty("/DialogServiceUnits/SubmitEnabled", SubmitEnabled);
		},

		onChangeServerType : function() {
			this._templateView.setProperty("/DialogServiceUnits/LoadBalancingEnabled", "N");
			let oTable = sap.ui.core.Fragment.byId("idFragmentDialogServiceUnit", "idServiceUnitsTable");
			oTable.setMode("SingleSelectLeft");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_ServiceUnits", []);
			this.setServiceUnitsTablesModel();
			this.setOrderButtons();
		},

		onChangeUseLoadBalancing : function(oEvent) {
			let LoadBalancingEnabled = this._templateView.getProperty("/DialogServiceUnits/LoadBalancingEnabled");
			let oTable = sap.ui.core.Fragment.byId("idFragmentDialogServiceUnit", "idServiceUnitsTable");
			if (LoadBalancingEnabled === "Y") {
				this._templateView.setProperty("/DialogServiceUnits/AlgorithmEnabled", true);
				oTable.setMode("MultiSelect");
			} else {
				this._templateView.setProperty("/DialogServiceUnits/AlgorithmEnabled", false);
				oTable.setMode("SingleSelectLeft");
			}
			if (oEvent) {
				this.setSubmitButton();
			}
			this.setOrderButtons();
		},

		onChangeAlgorithm : function() {
			this.setAlgoruthmText();
			this.setOrderButtons();
			this.setSubmitButton();
		},

		onServiceUnitsTableSelectionChange : function(oEvent) {
			let isSelectAll = oEvent.getParameter("selectAll");
			if (isSelectAll) {
				this.addAllServiceUnitsAsSelected();
				this.setOrderButtons();
				this.setSubmitButton();
				return;
			}
			let isSelected = oEvent.getParameter("selected");
			if (!isSelected) {
				let aListItems = oEvent.getParameter("listItems");
				let oServiceUnitsTable = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsTable");
				if (aListItems.length === oServiceUnitsTable.length) {//User pres on unselect all
					this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsSelected", []);
					this.setOrderButtons();
					this.setSubmitButton();
					return;
				}
			}
			let oServiceUnitsSelected;
			let LoadBalancingEnabled = this._templateView.getProperty("/DialogServiceUnits/LoadBalancingEnabled");
			if (LoadBalancingEnabled === "Y") {
				oServiceUnitsSelected = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsSelected");
			} else {
				oServiceUnitsSelected = [];
			}
			
			let oBindingContext = oEvent.getParameter("listItem").getBindingContext("templateView");
			let _SU_ID = oBindingContext.getProperty("ID");
			if (isSelected) {
				let _SU_Name = oBindingContext.getProperty("Name");
				let _SU_Version = oBindingContext.getProperty("Version");
				let _SU_NumTenants = oBindingContext.getProperty("NumTenants");
				oServiceUnitsSelected.push({
					"ID" : _SU_ID,
					"Name" : _SU_Name,
					"Version" : _SU_Version,
					"NumTenants" : _SU_NumTenants,
					"Order": oServiceUnitsSelected.length + 1,
					"MaxTenants" : 100
				});
			} else {
				let index = oServiceUnitsSelected.findIndex(x => x.ID === _SU_ID);
				if (index >= 0) {
					oServiceUnitsSelected.splice(index, 1);
					for (let i = index; i < oServiceUnitsSelected.length; i++) {
						oServiceUnitsSelected[i].Order = oServiceUnitsSelected[i].Order - 1;
					}
				}
			}

			this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsSelected", oServiceUnitsSelected);
			this.setOrderButtons();
			this.setSubmitButton();
		},

		addAllServiceUnitsAsSelected : function () {
			let oServiceUnitsTable = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsTable");
			let oServiceUnitsSelected = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsSelected");
			let _SU_ID, _SU_Name, _SU_Version, _SU_NumTenants, index;
			if (oServiceUnitsTable.length) {
				for (let i = 0; i < oServiceUnitsTable.length; i++) {
					_SU_ID = oServiceUnitsTable[i].ID;
					index = oServiceUnitsSelected.findIndex(x => x.ID === _SU_ID);
					if (index === -1) {
						_SU_Name = oServiceUnitsTable[i].Name;
						_SU_Version = oServiceUnitsTable[i].Version;
						_SU_NumTenants = oServiceUnitsTable[i].NumTenants;
						oServiceUnitsSelected.push({
							"ID" : _SU_ID,
							"Name" : _SU_Name,
							"Version" : _SU_Version,
							"NumTenants" : _SU_NumTenants,
							"Order": oServiceUnitsSelected.length + 1,
							"MaxTenants" : 100
						});
					}
				}
				this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsSelected", oServiceUnitsSelected);
			}
		},

		setOrderButtons : function() {
			let bMoveUpEnabled = false;
			let bMoveDownEnabled = false;
			let Algorithm = this._templateView.getProperty("/DialogServiceUnits/Algorithm");
			if (Algorithm == "R") {
				let oTable = sap.ui.core.Fragment.byId("idFragmentDialogServiceUnit", "idServiceUnitsSelected");
				let oSelectedItem = oTable.getSelectedItem();
				if (oSelectedItem) {
					let _Order = oTable.getSelectedItem().getBindingContext("templateView").getProperty("Order");
					let oServiceUnitsSelected = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsSelected");
					if (_Order > 1) {
						bMoveUpEnabled = true;
					}
					if (_Order < oServiceUnitsSelected.length) {
						bMoveDownEnabled = true;
					}
				}
			}
			this._templateView.setProperty("/DialogServiceUnits/MoveUpEnabled", bMoveUpEnabled);
			this._templateView.setProperty("/DialogServiceUnits/MoveDownEnabled", bMoveDownEnabled);
		},

		onServiceUnitsSelectedSelectionChange : function(oEvent) {
			this.setOrderButtons();
		},

		onMoveUp : function(oEvent) {
			let oTable = sap.ui.core.Fragment.byId("idFragmentDialogServiceUnit", "idServiceUnitsSelected");
			let oSelectedItem = oTable.getSelectedItem();
			if (oSelectedItem) {
				let _Order = oTable.getSelectedItem().getBindingContext("templateView").getProperty("Order");
				if (_Order > 1) {
					let oServiceUnitsSelected = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsSelected");
					oServiceUnitsSelected[_Order-1].Order = _Order - 1;
					oServiceUnitsSelected[_Order-2].Order = _Order;
					let temp = oServiceUnitsSelected[_Order-1];
					oServiceUnitsSelected[_Order-1] = oServiceUnitsSelected[_Order-2];
					oServiceUnitsSelected[_Order-2] = temp;
					this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsSelected", oServiceUnitsSelected);
					oTable.setSelectedItem(oTable.getItems()[_Order-2]);
					this.setOrderButtons();
					this.setSubmitButton();
				}
			}
		},

		onMoveDown : function() {
			let oTable = sap.ui.core.Fragment.byId("idFragmentDialogServiceUnit", "idServiceUnitsSelected");
			let oSelectedItem = oTable.getSelectedItem();
			if (oSelectedItem) {
				let _Order = oTable.getSelectedItem().getBindingContext("templateView").getProperty("Order");
				let oServiceUnitsSelected = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsSelected");
				if (_Order < oServiceUnitsSelected.length) {
					oServiceUnitsSelected[_Order-1].Order = _Order + 1;
					oServiceUnitsSelected[_Order].Order = _Order;
					let temp = oServiceUnitsSelected[_Order-1];
					oServiceUnitsSelected[_Order-1] = oServiceUnitsSelected[_Order];
					oServiceUnitsSelected[_Order] = temp;
					this._templateView.setProperty("/DialogServiceUnits/ServiceUnitsSelected", oServiceUnitsSelected);
					oTable.setSelectedItem(oTable.getItems()[_Order]);
					this.setOrderButtons();
					this.setSubmitButton();
				}
			}
		},

		onLiveChangeMaxTenants : function () {
			this.setSubmitButton();
		},

		handleServiceUnitsDialogClose : function () {
			this._oServiceUnitsDialog.close();
		},

		handleServiceUnitsDialogSubmit : function () {
			let aServiceUnitsSelected = this._templateView.getProperty("/DialogServiceUnits/ServiceUnitsSelected");
			let aTemplates_ServiceUnits = [];
			let _TemplateId = this._PartnerDataModel.getProperty(this._TemplatePath + "/id");
			if (aServiceUnitsSelected.length) {
				for (let i = 0; i < aServiceUnitsSelected.length; i++) {
					aTemplates_ServiceUnits.push({
						"TemplateId": _TemplateId,
						"HostingUnit_Id": aServiceUnitsSelected[i].ID,
						"HostingUnit_Name": aServiceUnitsSelected[i].Name,
						"Order": aServiceUnitsSelected[i].Order,
						"MaxTenants": aServiceUnitsSelected[i].MaxTenants
					});
				}
			}
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_ServiceUnits", aTemplates_ServiceUnits);
			let ServerType = this._templateView.getProperty("/DialogServiceUnits/ServerType");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/ServerType", ServerType);
			let LoadBalancingEnabled = this._templateView.getProperty("/DialogServiceUnits/LoadBalancingEnabled");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/LoadBalancing", (LoadBalancingEnabled === "Y") ? true : false);
			let Algorithm = this._templateView.getProperty("/DialogServiceUnits/Algorithm");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Algorithm", Algorithm);
			this._templateView.setProperty("/edited", true);
			this._oServiceUnitsDialog.close();
			this.setServiceUnitsInput();
			this.validateServiceUnit();
			this.setDataAfterServiceUnit();
			this.serviceUnitEffect(false);
			this._templateView.setProperty("/edited", true);
			this.setServiceUnitData();
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

		setServiceUnitsInput : function () {
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let sServiceUnitsInput = "";
			for(let i = 0; i < aTemplates_ServiceUnits.length; i++) {
				if (!aTemplates_ServiceUnits[i].HostingUnit_Name) {
					aTemplates_ServiceUnits[i].HostingUnit_Name = this.getServiceUnitName(aTemplates_ServiceUnits[i].HostingUnit_Id);
				}
				sServiceUnitsInput = sServiceUnitsInput.concat(aTemplates_ServiceUnits[i].HostingUnit_Name + ", ");
			}
			sServiceUnitsInput = sServiceUnitsInput.substring(0, sServiceUnitsInput.length - 2);
			this._templateView.setProperty("/TemplateServiceUnits", sServiceUnitsInput);
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_ServiceUnits", aTemplates_ServiceUnits);
		},

		getServiceUnitName : function (SU_ID) {
			let SU_Name;
			let oServiceunits = this._PartnerCombosModel.getProperty("/serviceunits/d/results");
			let indexServiceUnits = oServiceunits.findIndex(x => x.ID === SU_ID);
			if (indexServiceUnits >= 0) {
				SU_Name = oServiceunits[indexServiceUnits].Name;
			}
			return SU_Name;
		},

		//#endregion Service Unit Dialog

		//#region Extensions Dialog

		handleSearch: function(oEvent, column) {
			let sValue = oEvent.getParameter("value");
			let oFilter = new Filter(column, sap.ui.model.FilterOperator.Contains, sValue);
			let oBinding = oEvent.getSource().getBinding("items");
			if (oBinding) {
				oBinding.filter([oFilter]);
			}
		},

		setExtentionsDialogModel : function () {
			let oExtentionsTable = [];
			let oServiceunitsParams = this._PartnerCombosModel.getProperty("/allparams");
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let aTemplates_Extenstions = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Extenstions");
			let SU_ID, SU_Name, Deployment_ID, Extention_ID, indexServiceUnitParams, aExtentionPath, indexExtentionTable, indexTemplates_Extenstions, bSelected;
			if ((aTemplates_ServiceUnits) || (aTemplates_ServiceUnits.length > 0))
			{
				for(let i = 0; i < aTemplates_ServiceUnits.length; i++) {
					SU_ID = aTemplates_ServiceUnits[i].HostingUnit_Id;
					SU_Name = aTemplates_ServiceUnits[i].HostingUnit_Name;
					indexServiceUnitParams = oServiceunitsParams.findIndex(x => x.serviceunitID === SU_ID);
					if (indexServiceUnitParams >= 0) {
						aExtentionPath = oServiceunitsParams[indexServiceUnitParams].extensions.d.results;
						for(let j = 0; j < aExtentionPath.length; j++) {
							Deployment_ID = aExtentionPath[j].ID;
							Extention_ID = aExtentionPath[j].Extension.ID;
							indexTemplates_Extenstions = aTemplates_Extenstions.findIndex(x => x.Extension_Id === Extention_ID);
							if (indexTemplates_Extenstions >= 0) {
								bSelected = true;
							} else {
								bSelected = false;
							}
							indexExtentionTable = oExtentionsTable.findIndex(x => x.ID === Extention_ID);
							if (indexExtentionTable >= 0) {
								oExtentionsTable[indexExtentionTable].ServiceUnits = 
									oExtentionsTable[indexExtentionTable].ServiceUnits.concat(", " + SU_Name);
							} else {
								oExtentionsTable.push({
									"Selected" : bSelected,
									"ID" : Extention_ID,
									"Deployment_ID" : Deployment_ID,
									"Name" : aExtentionPath[j].Extension.Name,
									"Version" : aExtentionPath[j].Extension.Version,
									"Vendor" : aExtentionPath[j].Extension.Vendor,
									"Type" : aExtentionPath[j].Extension.Type,
									"ServiceUnits" : SU_Name,
									"ServiceUnitsState" : "None"
								});
							}
						}
					}
				}
			}
			this._templateView.setProperty("/DialogExtentions/ExtentionsTable", oExtentionsTable);
			this.setServiceUnitsState();
		},

		setServiceUnitsState : function () {
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let aExtentionsTable = this._templateView.getProperty("/DialogExtentions/ExtentionsTable");
			let aServiceUnits;
			for(let i = 0; i < aExtentionsTable.length; i++) {
				aServiceUnits = aExtentionsTable[i].ServiceUnits.split(",");
				aExtentionsTable[i].ServiceUnitsState = aTemplates_ServiceUnits.length === aServiceUnits.length ? "Success" : "Error";
			}
			this._templateView.setProperty("/DialogExtentions/ExtentionsTable", aExtentionsTable);
		},

		openExtensionsDialog : function() {
			if (this._oExtensionsDialog) {
				this._oExtensionsDialog.destroy();
			}
			this._oExtensionsDialog = sap.ui.xmlfragment("oem-partner.view.DialogExtensions", this);
			this._oExtensionsDialog.setMultiSelect(true);
			this.setExtentionsDialogModel();
			this.getView().addDependent(this._oExtensionsDialog);
			this._oExtensionsDialog.open();
		},
		
		handleExtensionsSearch : function() {
			// this.handleSearch(oEvent, "Name");
		},

		onTokenUpdateExtensions : function (oEvent) {
			let sType = oEvent.getParameter("type");
			if (sType === "removed") {
				let iKey = parseInt(oEvent.getParameter("removedTokens")[0].getProperty("key"));
				let sPath = this._TemplatePath + "/Templates_Extenstions";
				let aData = this._PartnerDataModel.getProperty(sPath);
				let idx;
				for(let i = 0; i < aData.length; i++) {
					if (aData[i].ExtensionDeployment_Id === iKey) {
						idx = i;
					}	
				}
				aData.splice(idx, 1);
				this._PartnerDataModel.setProperty(sPath, aData);
				this._templateView.setProperty("/edited", true);
			}	
		},

		handleExtensionsDialogConfirm : function (oEvent) {
			let aContexts = oEvent.getParameter("selectedContexts");
			let sPath, _index, _TemplateId, extensionData, sServiceUnitsState;
			_TemplateId = this._PartnerDataModel.getProperty(this._TemplatePath + "/id");
			let aTemplates_Extenstions = [];
			for(let i = 0; i < aContexts.length; i++) {
				sPath = aContexts[i].sPath;
				_index = sPath.split("/").slice(-1).pop();
				extensionData = this._templateView.getProperty("/DialogExtentions/ExtentionsTable/" + _index);
				sServiceUnitsState = this._templateView.getProperty("/DialogExtentions/ExtentionsTable/" + _index + "/ServiceUnitsState");
				if (sServiceUnitsState === "Error") {
					this.openExtensionsDialog();
					MessageBox.error(this._bundle.getText("ExtensionNotSUErrorMessage"));
					return;
				}
				aTemplates_Extenstions.push({
					"TemplateId": _TemplateId,
					"ExtensionDeployment_Id": extensionData.Deployment_ID,
         			"Extension_Id": extensionData.ID,
         			"Name": extensionData.Name,
         			"Version": extensionData.Version,
         			"Vendor": extensionData.Vendor,
         			"Type": extensionData.Type
				});			
			}
			this._PartnerDataModel.setProperty(this._TemplatePath + "/Templates_Extenstions", aTemplates_Extenstions);
			this._templateView.setProperty("/edited", true);
		},

		//#endregion Extensions Dialog

		//#region Backups/Packages Dialog

		openBackupsPackagesDialog : function () {
			let oSelectedKey = this._PartnerDataModel.getProperty(this._TemplatePath + "/CreationMethod");
			switch(oSelectedKey) {
				case "Backup":
					this.openBackupsDialog();
				break;
				case "Package":
					this.openPackagesDialog();
				break;
				default:
				break;
			}
		},

		openBackupsDialog : function() {
			if (this._oBackupsDialog) {
				this._oBackupsDialog.destroy();
			}
			this._oBackupsDialog = sap.ui.xmlfragment("oem-partner.view.DialogBackups", this);
			this.setBackupsDialogModel();
			this.getView().addDependent(this._oBackupsDialog);
			this._oBackupsDialog.open();
		},

		openPackagesDialog : function() {
			if (this._oPackagesDialog) {
				this._oPackagesDialog.destroy();
			}
			this._oPackagesDialog = sap.ui.xmlfragment("oem-partner.view.DialogPackages", this);
			this.setPackagesDialogModel();
			this.getView().addDependent(this._oPackagesDialog);
			this._oPackagesDialog.open();
		},

		setBackupsDialogModel : function () {
			let oBackupsTable = [];
			let oServiceunitsParams = this._PartnerCombosModel.getProperty("/allparams");
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let SU_ID, SU_Name, indexServiceUnitParams, aBackupPath, indexBackupsTable;
			if ((aTemplates_ServiceUnits) || (aTemplates_ServiceUnits.length > 0))
			{
				for(let i = 0; i < aTemplates_ServiceUnits.length; i++) {
					SU_ID = aTemplates_ServiceUnits[i].HostingUnit_Id;
					SU_Name = aTemplates_ServiceUnits[i].HostingUnit_Name;
					indexServiceUnitParams = oServiceunitsParams.findIndex(x => x.serviceunitID === SU_ID);
					if (indexServiceUnitParams >= 0) {
						aBackupPath = oServiceunitsParams[indexServiceUnitParams].backupPath;
						for(let j = 0; j < aBackupPath.length; j++) {
							indexBackupsTable = oBackupsTable.findIndex(x => x.Path === aBackupPath[j].Path);
							if (indexBackupsTable >= 0) {
								oBackupsTable[indexBackupsTable].ServiceUnits = 
									oBackupsTable[indexBackupsTable].ServiceUnits.concat(" , " + SU_Name);
							} else {
								oBackupsTable.push({
									"Name" : aBackupPath[j].Name,
									"Path" : aBackupPath[j].Path,
									"ServiceUnits" : SU_Name,
									"ServiceUnitsState" : "None"
								});
							}
						}
					}
				}
			}
			this._templateView.setProperty("/DialogBackups/BackupsTable", oBackupsTable);
			this.setBackupsState();
		},

		setBackupsState : function () {
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let aBackupsTable = this._templateView.getProperty("/DialogBackups/BackupsTable");
			let aServiceUnits;
			for(let i = 0; i < aBackupsTable.length; i++) {
				aServiceUnits = aBackupsTable[i].ServiceUnits.split(",");
				aBackupsTable[i].ServiceUnitsState = aTemplates_ServiceUnits.length === aServiceUnits.length ? "Success" : "Error";
			}
			this._templateView.setProperty("/DialogBackups/BackupsTable", aBackupsTable);
		},

		setPackagesDialogModel : function () {
			let oPackagesTable = [];
			let oServiceunitsParams = this._PartnerCombosModel.getProperty("/allparams");
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let SU_ID, SU_Name, indexServiceUnitParams, aPackagePath, indexPackagesTable;
			if ((aTemplates_ServiceUnits) || (aTemplates_ServiceUnits.length > 0))
			{
				for(let i = 0; i < aTemplates_ServiceUnits.length; i++) {
					SU_ID = aTemplates_ServiceUnits[i].HostingUnit_Id;
					SU_Name = aTemplates_ServiceUnits[i].HostingUnit_Name;
					indexServiceUnitParams = oServiceunitsParams.findIndex(x => x.serviceunitID === SU_ID);
					if (indexServiceUnitParams >= 0) {
						aPackagePath = oServiceunitsParams[indexServiceUnitParams].packagePath;
						for(let j = 0; j < aPackagePath.length; j++) {
							indexPackagesTable = oPackagesTable.findIndex(x => x.Path === aPackagePath[j].Path);
							if (indexPackagesTable >= 0) {
								oPackagesTable[indexPackagesTable].ServiceUnits = 
									oPackagesTable[indexPackagesTable].ServiceUnits.concat(", " + SU_Name);
							} else {
								oPackagesTable.push({
									"FileName": aPackagePath[j].FileName,
									"Path": aPackagePath[j].Path,
									"ServiceUnits": SU_Name,
									"ServiceUnitsState" : "None"
								});
							}
						}
					}
				}
			}
			this._templateView.setProperty("/DialogPackages/PackagesTable", oPackagesTable);
			this.setPackagesState();
		},

		setPackagesState : function () {
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
			let aPackagesTable = this._templateView.getProperty("/DialogPackages/PackagesTable");
			let aServiceUnits;
			for(let i = 0; i < aPackagesTable.length; i++) {
				aServiceUnits = aPackagesTable[i].ServiceUnits.split(",");
				aPackagesTable[i].ServiceUnitsState = aTemplates_ServiceUnits.length === aServiceUnits.length ? "Success" : "Error";
			}
			this._templateView.setProperty("/DialogPackages/PackagesTable", aPackagesTable);
		},

		handleBackupsPackagesDialogSubmit : function (oEvent) {
			let aContexts = oEvent.getParameter("selectedContexts");
			let sPath = aContexts[0].sPath;
			let _index = sPath.split("/").slice(-1).pop();
			let sServiceUnitsState = this._templateView.getProperty("/DialogBackups/BackupsTable/" + _index + "/ServiceUnitsState");
			if (sServiceUnitsState === "Error") {
				this.openBackupsPackagesDialog();
				MessageBox.error(this._bundle.getText("BackupPackageNotSUErrorMessage"));
				return;
			}
			let Path, Name;
			let oSelectedKey = this._PartnerDataModel.getProperty(this._TemplatePath + "/CreationMethod");
			switch(oSelectedKey) {
				case "Backup":
					Path = this._templateView.getProperty("/DialogBackups/BackupsTable/" + _index + "/Path");
					Name = this._templateView.getProperty("/DialogBackups/BackupsTable/" + _index + "/Name");
				break;
				case "Package":
					Path = this._templateView.getProperty("/DialogPackages/PackagesTable/" + _index + "/Path");
					Name = this._templateView.getProperty("/DialogPackages/PackagesTable/" + _index + "/FileName");
				break;
				default:
				break;
			}
			this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackage", Path);
			this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackageName", Name);
			
			this._templateView.setProperty("/edited", true);
			this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettings", "");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/LocalSettingsName", "");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/ChartOfAccount", "");
			this._PartnerDataModel.setProperty(this._TemplatePath + "/SystemLanguage", null);

			this.validateBackupPackage();
			if (oSelectedKey === "Package") {
				this.tryGetSolutionPackageData();
			}
		},

		setBackupPackageName : function () {
			let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
			let aServiceunitsParams = this.getServiceUnitParams();
			let backupPackageName = "";
			if (aServiceunitsParams) {
				let oSelectedKey = this._PartnerDataModel.getProperty(this._TemplatePath + "/CreationMethod");
				let index;
				switch(oSelectedKey) {
					case "Backup":
						let aBackupPath = aServiceunitsParams.backupPath;
						index = aBackupPath.findIndex(x => x.Path==oTemplate.BackupPackage);
						backupPackageName = aBackupPath[index].Name;
					break;
					case "Package":
						let aPackagePath = aServiceunitsParams.packagePath;
						index = aPackagePath.findIndex(x => x.Path==oTemplate.BackupPackage);
						backupPackageName = aPackagePath[index].FileName;
					break;
					default:
					break;
				}
				this._PartnerDataModel.setProperty(this._TemplatePath + "/BackupPackageName", backupPackageName);
			}
		},

		//#endregion Backups/Packages Dialog

		//#region License File Dialog

		openLicenseFileDialog : function(oEvent) {

			if (this._oLicenseFileDialog) {
				this._oLicenseFileDialog.destroy();
			}
			this._oLicenseFileDialog = sap.ui.xmlfragment("oem-partner.view.DialogLicenseFile", this);
			this.getView().addDependent(this._oLicenseFileDialog);
			this._oLicenseFileDialog.open();
		},

		handleLicenseFileSearch : function(oEvent) {
			this.handleSearch(oEvent, "InstallationNumber");
		},

		handleLicenseFileDialogConfirm : function (oEvent) {
			let aContexts = oEvent.getParameter("selectedContexts");
			let sPath = aContexts[0].sPath;
			let _index = sPath.split("/").slice(-1).pop();

			let temp = this._PartnerCombosModel.oData.licenseFilesModules[_index].LicenseFile_Id;
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
			let LicenseFileId_PartnerModel = this._PartnerDataModel.oData.Templates[this._TemplateIndex].LicenseFile_Id;
			for(let i = 0; i < this._PartnerCombosModel.oData.licensemodules.length; i++) {
				let licenseFileID_ComboModel = this._PartnerCombosModel.oData.licensemodules[i].d.licenseFileID;
				if (licenseFileID_ComboModel == LicenseFileId_PartnerModel)
				{
					for(let j = 0; j < this._PartnerCombosModel.oData.licensemodules[i].d.results.length; j++) {
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
			for(let i = 0; i < this._PartnerCombosModel.oData.licensesModules.length; i++) {
				let type = this._PartnerCombosModel.oData.licensesModules[i].Type;
				let index = licenses.findIndex(x => x.LicenseType==type);
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
			let aContexts = oEvent.getSource().getParent().getBindingContext("PartnerData");
			let sPath = aContexts.sPath;
			let _index = sPath.split("/").slice(-1).pop();
			let _User_Id = this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_index].User_Id;
			this._PartnerDataModel.oData.Temp_Status = "dialogLicenseOperator," + _index + "," + _User_Id;
			this.openAssignLicensesDialog(this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_index].Operators_licenses);
		},

		openAssignLicensesDialog : function(aLicenses) {
			if (!aLicenses) {
				aLicenses = [];
			}
			this.setAssignLicensesSelected(aLicenses);
			
			if (this._oAssignLicensesDialog) {
				this._oAssignLicensesDialog.destroy();	
			}
			this._oAssignLicensesDialog = sap.ui.xmlfragment("oem-partner.view.DialogAssignLicenses", this);
			this._oAssignLicensesDialog.setMultiSelect(true);
			this.getView().addDependent(this._oAssignLicensesDialog);
			this._oAssignLicensesDialog.open();
		},

		handleAssignLicensesSearch  : function(oEvent) {
			this.handleSearch(oEvent, "Description");
		},

		onTokenUpdateLicenseType : function (oEvent) {
			let sType = oEvent.getParameter("type");
			if (sType === "removed") {
				let sKey = oEvent.getParameter("removedTokens")[0].getProperty("key");
				let sPath = this._TemplatePath + "/Templates_Licenses";
				let aData = this._PartnerDataModel.getProperty(sPath);
				let idx;
				for(let i = 0; i < aData.length; i++) {
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
			let sType = oEvent.getParameter("type");
			let aContexts = oEvent.getSource().getParent().getBindingContext("PartnerData");
			let sPath = aContexts.sPath;
			let _indexOperator = sPath.split("/").slice(-1).pop();
			if (sType === "removed") {
				let sKey = oEvent.getParameter("removedTokens")[0].getProperty("key");
				let sPath = this._TemplatePath + "/Templates_Operators/" + _indexOperator + "/Operators_licenses";
				let aData = this._PartnerDataModel.getProperty(sPath);
				let idx;
				for(let i = 0; i < aData.length; i++) {
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
			let aContexts = oEvent.getParameter("selectedContexts");
			let sPath, _indexOperator, _indexModule, _LicenseType;
			let _TemplateId = this._PartnerDataModel.oData.Templates[this._TemplateIndex].id;
			let _User_Id;
			if (this._PartnerDataModel.oData.Temp_Status == "dialogLicenseType") {
				this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Licenses = [];
			}
			else if (this._PartnerDataModel.oData.Temp_Status.includes("dialogLicenseOperator")) {
				_indexOperator = this._PartnerDataModel.oData.Temp_Status.split(",")[1];
				_User_Id = parseInt(this._PartnerDataModel.oData.Temp_Status.split(",")[2]);
				this._PartnerDataModel.oData.Templates[this._TemplateIndex].Templates_Operators[_indexOperator].Operators_licenses = [];
			}
			for(let i = 0; i < aContexts.length; i++) {
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
			if (this._oOperatorDialog) {
				this._oOperatorDialog.destroy();
			}
			this._oOperatorDialog = sap.ui.xmlfragment("oem-partner.view.DialogOperator", this);
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

		toggleServiceLayer : function () {
			let bIsServiceLayer = this.isServiceLayer();

			if (bIsServiceLayer) {
				this.addServiceLayerOpertor();
			}
		},

		isServiceLayer : function () {
			let sServerType = this._PartnerDataModel.getProperty(this._TemplatePath + "/ServerType");
			if ((!sServerType) || !(sServerType.includes("HANA"))) {
				return false;
			}

			let sServiceLayerOpertor = this._PartnerDataModel.getProperty("/Cloud_Setting/0/SLUserName");
			if (!sServiceLayerOpertor) {
				return false;
			}

			return true;
		},

		addServiceLayerOpertor : function () {
			let sServiceLayerOpertor = this._PartnerDataModel.getProperty("/Cloud_Setting/0/SLUserName");
			let aOperatorsModel = this._PartnerCombosModel.getProperty("/operators/d/results");
			let indexFound = aOperatorsModel.findIndex(x => x.SystemUsername == sServiceLayerOpertor);
			let aTemplates_Operators = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Operators");			
			let indexFoundTemplateOperator = -1;
			if (!aTemplates_Operators) {
				aTemplates_Operators = [];
			} else {
				indexFoundTemplateOperator = aTemplates_Operators.findIndex(x => x.SystemUser == sServiceLayerOpertor);
			}
			if ((indexFound >= 0) && (indexFoundTemplateOperator === -1)) {
				let _TemplateId = this._PartnerDataModel.getProperty(this._TemplatePath + "/id");
				let _User_Id = aOperatorsModel[indexFound].ID;
				let _SystemUser = aOperatorsModel[indexFound].SystemUsername;
				let _SuperUser = aOperatorsModel[indexFound].IsSuperSBOUser;
				let _PowerUser = aOperatorsModel[indexFound].IsPowerSBOUser;
				let _Status = aOperatorsModel[indexFound].Status;

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
			}
		},

		//#endregion Operator Dialog

		//#region SolutionPackage Model

		tryGetSolutionPackageData : function () {
			let oTemplate = this._PartnerDataModel.getProperty(this._TemplatePath);
			if ((oTemplate.CreationMethod === "Package") && 
				(oTemplate.BackupPackage)) {
				this.getSolutionPackageData({
					"serviceunit" : oTemplate.Templates_ServiceUnits[0].HostingUnit_Id,
					"packagePath" : oTemplate.BackupPackage
				});
			}
		},

		getSolutionPackageData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/getSolutionPackageContent");
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true,
                dataType: 'json',
                contentType: "application/x-www-form-urlencoded",
                data: JSON.stringify(data),
                success: function(result){
					this.handleGetSolutionPackageDataSuccess(result);
                }.bind(this),
                error: function(error) {
					this.handleGetSolutionPackageDataErrors(error);
                 }.bind(this)               
              });
		},
		
		handleGetSolutionPackageDataSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setSolutionPackageData(data);
            }
		},
		
		setSolutionPackageData : function (result) {
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
		
			this.validateBackupPackage();
			this.validateLocalSettings();
			this.validateChartOfAccount();
			this.validateSystemLanguesge();
		},

		// Populate LocalSettingsName key after LocalSettings key was changed.
		setLocalSettingsName : function () {
			let code = this._PartnerDataModel.getProperty(this._TemplatePath + "/LocalSettings");
			let arr = this._PartnerCombosModel.getProperty("/localSettings");
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
			let arr = this._PartnerCombosModel.getProperty("/systemLanguesge");
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
			let idx = oEvent.getParameter('listItem').getBindingContext("PartnerData").getPath().split("/")[4];
			let aTemplatesOperators = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_Operators");
			if (this.isServiceLayer()) {
				if (aTemplatesOperators[idx].SystemUser === this._PartnerDataModel.getProperty("/Cloud_Setting/0/SLUserName")) {
					let msg = this._bundle.getText("ServiceLayerOperatorDeleteMsgs");
					MessageBox.warning(msg);
					return;
				}
			}
			let msg = this._bundle.getText("OperatorDeleteMsgs");
			MessageBox.warning(
				msg,
				{
					icon: MessageBox.Icon.WARNING,
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
					initialFocus: MessageBox.Action.CANCEL,
					onClose: function(sAction) {
						if (sAction == "YES") {
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
				let C_Name = this._countriesDataModel.getProperty("/Countries/" + C_index + "/Name");
				this._PartnerDataModel.setProperty(this._TemplatePath + "/Country_Name", C_Name);
			}
		},

		validateServiceUnit : function () {
			let aTemplates_ServiceUnits = this._PartnerDataModel.getProperty(this._TemplatePath + "/Templates_ServiceUnits");
            if (aTemplates_ServiceUnits.length === 0) {
				if (this._templateView.getProperty("/isSaving")) {
					this._templateView.setProperty("/serviceUnitVS", "Error");
				}
            } else {
				this._templateView.setProperty("/serviceUnitVS", "None");
            }
		},

		validateBackupPackage : function () {
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
                let msg = this._bundle.getText("TemplateValidationError");
                MessageBox.error(msg);
                return;
			}
			if (this.isDuplicateCountryAndPackage()) {
                let msg = this._bundle.getText("TemplateDuplucateCountryPackageError");
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

			let msg = this._bundle.getText("TemplateDiscardMsgs");
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