sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(BaseController, JSONModel, MessageToast, MessageBox) {
	
	"use strict";
	
   return BaseController.extend("oem-partner.controller.SetupPage", {  
       
        //#region Init

   		onInit : function () {
			this.getRouter().getRoute("setup").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched : function() {
			this.onPageLoad();
		},
        
        initLocals : function() {
            this._bundle = this.getModel("i18n").getResourceBundle();
            this._setupDataModel = this.getSetModel("setupData");
            this._sldDataModel = this.getSetModel("sldData");
            this._serviceLayerDataModel = this.getSetModel("serviceLayerData");
            // Model used to manipulate control states
            let oViewModel = new JSONModel({
                "sldSetupStepValidated" : false,
                "dbSetupStepValidated" : false,
                "tokenSetupStepValidated" : false,
                "ServiceLayerSetupStepValidated" : false,
                "loginSldUrlButtonVisible" : false,
                "loginSldCrdtButtonVisible" : false,
                "ConnectDbButtonVisible" : false,
                "LoginServiceLayerButtonVisible" : false
            });
            this._viewModel = this.getSetModel("setupView", oViewModel);
            this.initWizardReview();
        },

        onPageLoad : function() {
            if (!this._setupDataModel) {
				this.initLocals();
            }
            
            this.getSetupData();
        },

        //#endregion Init

        //#region Config File Setup Model

        getSetupData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getSetupData");
			let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
				dataType: 'json'
			}).then(function(result){
					this.handleGetSetupDataSuccess(result);
				}.bind(this), function(error) {
					this.handleGetSetupDataErrors(error);
                }.bind(this));
        },
        
        handleGetSetupDataErrors : function (result) {
            let msg;
            if (result.status) {
                switch(result.status) {
                    default:
                        msg = this._bundle.getText("GeneralServerError");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
        },

        handleGetSetupDataSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setSetupData(data);
            }
        },

        setSetupData : function (data) {
            let tempData = {};
            tempData.sldURL = data.sldURL;
            tempData.token = data.token;
            tempData.server = data.server;
            tempData.port = data.port;
            tempData.user = data.user;
            tempData.password = "xxxxxx";
            this._setupDataModel.setData(tempData);
            this.runSldUrlFormValidation();
        },

        //#endregion Config File Setup Model

        //#region SLD URL Setup Validations

        validateSldURL : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._setupDataModel.getProperty("/sldURL");
			}
            if (!sValue) {
                this._viewModel.setProperty("/sldURLVS", "Error");
            } else {
                this._viewModel.setProperty("/sldURLVS", "None");
            }
            if (oEvent) {
                this.sldUrlFormValidation(oEvent);
            }
        },

        runSldUrlFormValidation : function () {
            this.validateSldURL();
            this.sldUrlFormValidation();
        },

        sldUrlFormValidation : function (oEvent) {
            let bValidation = (this._viewModel.getProperty("/sldURLVS") === "None");
            if (oEvent) {
                this.setSldUrlButtons(false, bValidation);
            } else {
                if (bValidation) {
                    this.setSldCredentialData();
                }
            }
        },

        setSldUrlButtons : function (NextStep, Login) {
            this._viewModel.setProperty("/sldSetupStepValidated", NextStep);
            this._viewModel.setProperty("/loginSldUrlButtonVisible", Login);
        },

        //#endregion SLD URL Setup Validations

        //#region SLD URL Login

        onSldUrlLogin : function () {
            this.saveSldUrl({
                "sldURL": this._setupDataModel.getProperty("/sldURL")
            });
        },

        saveSldUrl : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/saveSldUrl");
            let reqURL = this._serverURL + methodName;
			return $.ajax({
                url: reqURL,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data)
			}).then(function(result){
                    this.handleSaveSldUrlSuccess(result);
				}.bind(this), function(error) {
                    this.handleSaveSldUrlErrors(error);
                 }.bind(this));
        },
        
        handleSaveSldUrlSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                if (this.isErrorOK(data)) {
                    let errors = data.errors;
                    if (errors[0].errCode > 0) {
                        let errText = this.getErrorTextUser(errors[0].errCode);
                        if (!errText) {
                            errText = this._bundle.getText("SendSldLoginError404");
                        }
                        MessageBox.error(errText);
                        return;
                    }
                }
                let msg = this._bundle.getText("SLDStepSuccessMessage");
                MessageToast.show(msg);
                this.setSldUrlButtons(true, false);
            }
        },

        handleSaveSldUrlErrors : function (result) {
            this.setSldUrlButtons(false, true);
            let msg;
            if (result.status) {
                switch(result.status) {
                    case 404:
                        msg = this._bundle.getText("SendSldLoginError404");
                        break;
                    default:
                        msg = this._bundle.getText("SendSldLoginError404");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
        },

        //#endregion SLD URL Login

        //#region SLD Credential Setup Model

        setSldCredentialData : function (data) {
            let tokenValue = this._setupDataModel.getProperty("/token");
            let tempData = {};
            if (tokenValue) {
                tempData.SldUserName = "xxxxxx";
                tempData.SldPassword = "xxxxxx";    
                this._sldDataModel.setData(tempData);
                
            }
            this.setSldUrlButtons(true, false);
            this.runSldCredentialFormValidation();
        },
        
        //#endregion SLD Credential Setup Model

        //#region SLD Credential Setup Validations

        validateSldUserName : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._sldDataModel.setProperty("/SldPassword", "");
                this._viewModel.setProperty("/SldPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._sldDataModel.getProperty("/SldUserName");
			}
            if (!sValue) {
                this._viewModel.setProperty("/SldUserNameVS", "Error");
            } else {
                this._viewModel.setProperty("/SldUserNameVS", "None");
            }
            if (oEvent) {
                this.sldCredentialFormValidation(false);
            }
        },

        validateSldPassword : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._sldDataModel.getProperty("/SldPassword");
			}
            if (!sValue) {
                this._viewModel.setProperty("/SldPasswordVS", "Error");
            } else {
                this._viewModel.setProperty("/SldPasswordVS", "None");
            }
            if (oEvent) {
                this.sldCredentialFormValidation(false);
            }
        },

        runSldCredentialFormValidation : function () {
            this.validateSldUserName();
            this.validateSldPassword();
            this.sldCredentialFormValidation(true);
        },

        sldCredentialFormValidation : function (isInnerEvent) {
            let bValidation = ((this._viewModel.getProperty("/SldUserNameVS") === "None") &&
                (this._viewModel.getProperty("/SldPasswordVS") === "None"));
            if (isInnerEvent) {
                if (this._setupDataModel.getProperty("/token")) {
                    this.setSldCredentialButtons(true, false);
                    this.runDbFormValidation();
                }
            } else {
                this.setSldCredentialButtons(false, bValidation);
            }
        },

        setSldCredentialButtons : function (NextStep, SldLogin) {
            this._viewModel.setProperty("/tokenSetupStepValidated", NextStep);
            this._viewModel.setProperty("/loginSldCrdtButtonVisible", SldLogin);
        },

        //#endregion SLD Credential Setup Validations

        //#region SLD Credential Login

        onSldCrdtLogin : function () {
            this.sldCrdtLogin({
                "SldUserName": this._sldDataModel.getProperty("/SldUserName"),
                "SldPassword": this._sldDataModel.getProperty("/SldPassword")
            });
        },

        sldCrdtLogin : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/sendSldLogin");
            let reqURL = this._serverURL + methodName;
			return $.ajax({
                url: reqURL,
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true,
                dataType: 'json',
                contentType: "application/x-www-form-urlencoded",
                data: JSON.stringify(data)
			}).then(function(result){
                    this.handleSldCrdtLoginSuccess(result);
				}.bind(this), function(error) {
                    this.handleSldCrdtLoginErrors(error);
                 }.bind(this));
        },
        
        handleSldCrdtLoginSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                if (this.isErrorOK(data)) {
                    let errors = data.errors;
                    if (errors[0].errCode > 0) {
                        let errText = this.getErrorTextUser(errors[0].errCode);
                        if (!errText) {
                            errText = this._bundle.getText("SendSldLoginError404");
                        }
                        MessageBox.error(errText);
                        return;
                    }
                }
                if (this.isKeyOK(data, 'result', 'object')) {
                    if (data.result.setToken) {
                        let msg = this._bundle.getText("SLDStepSuccessMessage");
                        MessageToast.show(msg);
                        this.setSldCredentialButtons(true, false);
                    } else {
                        let errText = this._bundle.getText("SldCrdtError");
                        MessageBox.error(errText);
                    }
                }
            }
        },

        handleSldCrdtLoginErrors : function (result) {
            this.setSldCredentialButtons(false, true);
            let msg;
            if (result.status) {
                switch(result.status) {
                    case 404:
                        msg = this._bundle.getText("SendSldLoginError404");
                        break;
                    default:
                        msg = this._bundle.getText("SendSldLoginError404");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
        },

        //#endregion SLD Credential Login

        //#region Save DB Setup Data

        onConnectDB : function () {
            this.saveSetupData(this._setupDataModel.oData);
        },

        saveSetupData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/saveSetupData");
            let reqURL = this._serverURL + methodName;
			return $.ajax({
                url: reqURL,
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true,
                dataType: 'json',
                contentType: "application/x-www-form-urlencoded",
                data: JSON.stringify(data)
			}).then(function(result){
                    this.handleSaveSetupSuccess(result);
				}.bind(this), function(error) {
                    this.handleSaveSetupErrors(error);
                 }.bind(this));
		},

        handleSaveSetupErrors : function (result) {
            let msg;
            if (result.status) {
                switch(result.status) {
                    case 503:
                        msg = this._bundle.getText("SaveDbSetupError503");
                        break;
                    default:
                        msg = this._bundle.getText("SaveDbSetupError503");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
        },

        handleSaveSetupSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setDbData(data);
            }
        },

        setDbData : function (result) {
            if ((this.isKeyOK(result, 'errors', 'object')) && (result.errors.length > 0) && (this.isKeyOK(result.errors[0], 'errCode', 'number'))) {
                let errText = this.getErrorText(result.errors[0].errCode);
                MessageBox.error(errText);
                return;
            }
            let msg = this._bundle.getText("SetupDBSaveSuccess");
            MessageToast.show(msg);
            this.setDbButtons(true, false);
        },

        //#endregion Save DB Setup Data

        //#region DB Setup Validations

        onActivateDbSetupStep : function() {
            this.runDbFormValidation();
        },
        
        validateDbServer : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._setupDataModel.setProperty("/password", "");
                this._viewModel.setProperty("/dbPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._setupDataModel.getProperty("/server");
			}
            if (!sValue) {
                this._viewModel.setProperty("/dbServerVS", "Error");
            } else {
                this._viewModel.setProperty("/dbServerVS", "None");
            }
            if (oEvent) {
                this.dbFormValidation(oEvent);
            }
        },

        validateDbPort : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._setupDataModel.setProperty("/password", "");
                this._viewModel.setProperty("/dbPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._setupDataModel.getProperty("/port");
			}
            if (!sValue) {
                this._viewModel.setProperty("/dbPortVS", "Error");
            } else {
                this._viewModel.setProperty("/dbPortVS", "None");
            }
            if (oEvent) {
                this.dbFormValidation(oEvent);
            }
        },

        validateDbUser : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._setupDataModel.setProperty("/password", "");
                this._viewModel.setProperty("/dbPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._setupDataModel.getProperty("/user");
			}
            if (!sValue) {
                this._viewModel.setProperty("/dbUserVS", "Error");
            } else {
                this._viewModel.setProperty("/dbUserVS", "None");
            }
            if (oEvent) {
                this.dbFormValidation(oEvent);
            }
        },

        validateDbPassword : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._setupDataModel.getProperty("/password");
			}
            if (!sValue) {
                this._viewModel.setProperty("/dbPasswordVS", "Error");
            } else {
                this._viewModel.setProperty("/dbPasswordVS", "None");
            }
            if (oEvent) {
                this.dbFormValidation(oEvent);
            }
        },

        runDbFormValidation : function () {
            this.validateDbServer();
            this.validateDbPort();
            this.validateDbUser();
            this.validateDbPassword();
            this.dbFormValidation();
        },

        dbFormValidation : function (oEvent) {
            let bValidation = ((this._viewModel.getProperty("/dbServerVS") === "None") &&
                (this._viewModel.getProperty("/dbPortVS") === "None") &&
                (this._viewModel.getProperty("/dbUserVS") === "None") &&
                (this._viewModel.getProperty("/dbPasswordVS") === "None"));
            if (oEvent) {
                this.setDbButtons(false, bValidation);
            } else {
                if (bValidation) {
                    this.getServiceLayerData();
                    this.getPartnerCombos();
                }
            }
        },

        setDbButtons : function (NextStep, ConnectDb) {
            this._viewModel.setProperty("/dbSetupStepValidated", NextStep);
            this._viewModel.setProperty("/ConnectDbButtonVisible", ConnectDb);
        },

        //#endregion DB Setup Validations
        
        //#region Get Partner Combos

        getPartnerCombos : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getPartnerCombos");
            let reqURL = this.getServerURL() + methodName;
            return $.ajax({
                url: reqURL,
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                dataType: 'json'
            }).then(function(result){
                    this.handleGetPartnerCombosSuccess(result);
                }.bind(this), function(error) {
                    this.handleGetPartnerCombosErrors(error);
                }.bind(this));
        },
        
        handleGetPartnerCombosSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setServiceLayerUsernames(data);
            }
        },

        handleGetPartnerCombosErrors : function (result) {
            
        },

        //#endregion Get Partner Combos

        //#region Service Layer Setup Model

		getServiceLayerData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getServiceLayerData");
			let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
				dataType: 'json'
			}).then(function(result){
					this.handleGetServiceLayerDataSuccess(result);
				}.bind(this), function(error) {
					this.handleGetServiceLayerDataErrors(error);
                }.bind(this));
        },
        
        handleGetServiceLayerDataSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setServiceLayerData(data);
            }
        },

        setServiceLayerData : function (data) {
            if (this.isKeyOK(data, 'result', 'object')) {
                this.setDbButtons(true, false);
                if (data.result[0].SLUserName) {
                    let tempData = {};
                    tempData.ServiceLayerUserName = data.result[0].SLUserName;
                    tempData.ServiceLayerPassword = "xxxxxx";
                    this._viewModel.setProperty("/IsServiceLayer", true);
                    this._serviceLayerDataModel.setData(tempData);
                    this.runServiceLayerFormValidation("AfterGet");
                } else {
                    this.toggleServiceLayerDisable(false, "AfterGet");
                    this.setServiceLayerButtons(true, false);
                }
            } else {
                this.setDbButtons(false, true);
            }
        },

        handleGetServiceLayerDataErrors : function (result) {
            this.setDbButtons(false, true);
            let msg = this._bundle.getText("GeneralServerError");
            MessageBox.error(msg);
        },

        setServiceLayerUsernames : function (data) {
            if (this.isKeyOK(data, 'operators', 'object')) {
                let aServiceLayerUsernames = [];
                aServiceLayerUsernames.push({"Code" : "", "Name" : ""});
                for(let i = 0; i < data.operators.d.results.length; i++) {
                    aServiceLayerUsernames.push({
                        "Code" : data.operators.d.results[i].SystemUsername, 
                        "Name" : data.operators.d.results[i].SystemUsername
                    });
                }
                this._viewModel.setProperty("/ServiceLayerUsernames", aServiceLayerUsernames);
            } else {

            }
        },

        //#endregion Service Layer Setup Model

        //#region Service Layer Setup Validations

        onActivateServiceLayerStep : function() {
            this.setServiceLayerButtons(true, false);
        },

        onSelectIsServiceLayer : function(oEvent) {
            this.toggleServiceLayerDisable(this._viewModel.getProperty("/IsServiceLayer"), "AfterClick");
        },

        toggleServiceLayerDisable : function (isServiceLayer, sAction) {
            this._viewModel.setProperty("/IsServiceLayer", isServiceLayer);
            this._serviceLayerDataModel.setProperty("/ServiceLayerUserName", "");
            this._viewModel.setProperty("/ServiceLayerUserNameVS", "None");
            this._serviceLayerDataModel.setProperty("/ServiceLayerPassword", "");
            this._viewModel.setProperty("/ServiceLayerPasswordVS", "None");
            if (isServiceLayer) {
                this.runServiceLayerFormValidation(sAction);
            } else {
                this.setServiceLayerButtons(false, true);
            }
        },

        validateServiceLayerUserName : function (oEvent) {
			if (oEvent) {
                this._serviceLayerDataModel.setProperty("/ServiceLayerPassword", "");
                this._viewModel.setProperty("/ServiceLayerPasswordVS", "Error");
            }
            
			let sValue = this._serviceLayerDataModel.getProperty("/ServiceLayerUserName");

            if (!sValue) {
                this._viewModel.setProperty("/ServiceLayerUserNameVS", "Error");
            } else {
                this._viewModel.setProperty("/ServiceLayerUserNameVS", "None");
            }
            if (oEvent) {
                this.serviceLayerFormValidation("AfterClick");
            }
        },

        validateServiceLayerPassword : function (oEvent) {
			let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._serviceLayerDataModel.getProperty("/ServiceLayerPassword");
			}
            if (!sValue) {
                this._viewModel.setProperty("/ServiceLayerPasswordVS", "Error");
            } else {
                this._viewModel.setProperty("/ServiceLayerPasswordVS", "None");
            }
            if (oEvent) {
                this.serviceLayerFormValidation("AfterClick");
            }
        },

        runServiceLayerFormValidation : function (sAction) {
            this.validateServiceLayerUserName();
            this.validateServiceLayerPassword();
            this.serviceLayerFormValidation(sAction);
        },

        serviceLayerFormValidation : function (sAction) {
            let bValidation = ((this._viewModel.getProperty("/ServiceLayerUserNameVS") === "None") &&
                (this._viewModel.getProperty("/ServiceLayerPasswordVS") === "None"));
            switch(sAction) {
                case "AfterClick":
                    this.setServiceLayerButtons(false, bValidation);
                break;
                case "AfterGet":
                    this.setServiceLayerButtons(bValidation, false);
                break;
                default:
                this.setServiceLayerButtons(false, false);
            }
        },

        setServiceLayerButtons : function (NextStep, ServiceLayerLogin) {
            this._viewModel.setProperty("/ServiceLayerSetupStepValidated", NextStep);
            this._viewModel.setProperty("/LoginServiceLayerButtonVisible", ServiceLayerLogin);
        },

        //#endregion Service Layer Setup Validations

        //#region Service Layer Login

        onServiceLayerLogin : function () {
            let serviceLayerData = this._serviceLayerDataModel.getProperty("/");
            this.checkServiceLayerLogin({
                "SLUserName": serviceLayerData.ServiceLayerUserName,
                "SLPassword": serviceLayerData.ServiceLayerPassword
            });
        },

        checkServiceLayerLogin : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/sendServiceLayerLogin");
            let reqURL = this._serverURL + methodName;
			return $.ajax({
                url: reqURL,
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true,
                dataType: 'json',
                contentType: "application/x-www-form-urlencoded",
                data: JSON.stringify(data)
			}).then(function(result){
                    this.handleServiceLayerLoginSuccess(result);
				}.bind(this), function(error) {
                    this.handleServiceLayerLoginErrors(error);
                 }.bind(this));
        },
        
        handleServiceLayerLoginSuccess : function (data) {
            if (this.isSamlRequest(data)) {
                this.handleSsoRequest(data);
            } else {
                this.setServiceLayerLoginData(data);
            }
        },

        setServiceLayerLoginData : function (result) {
            let errors;
            if (this.isErrorOK(result)) {
                errors = result.errors;
            }
            if (errors[0].errCode > 0) {
                MessageBox.error(this._bundle.getText("ServiceLayerStepErrorMessage"));
                return;
            }
            let isSaved = false;
            if (this.isKeyOK(result, 'result', 'object')) {
                isSaved = result.result.isSaved;
                if (isSaved) {
                    MessageToast.show(this._bundle.getText("ServiceLayerStepSuccessMessage"));
                    this.setServiceLayerButtons(true, false);
                    return;
                }
            }
            MessageBox.error(this._bundle.getText("ServiceLayerStepErrorMessage"));
            this.setServiceLayerButtons(false, true);
        },

        handleServiceLayerLoginErrors : function (result) {
            this.setServiceLayerButtons(false, true);
            let msg = this._bundle.getText("GeneralServerError");
            MessageBox.error(msg);
        },

        //#endregion Service Layer Login

        //#region Review Wizard

        initWizardReview : function () {
            this._wizard = this.byId("SetupWizard");
			this._oWizardContentPage = this.byId("setupContentPage");
            this._oWizardReviewPage = sap.ui.xmlfragment("oem-partner.view.SetupReview", this);
            this._oNavContainer = this.byId("setupNavContainer");
			this._oNavContainer.addPage(this._oWizardReviewPage);
        },

        wizardCompletedHandler : function () {
			this._oNavContainer.to(this._oWizardReviewPage);
        },

        backToWizardContent : function () {
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
			let fnAfterNavigate = function () {
				this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this.backToWizardContent();
		},
        
        onCancel : function(oEvent) {
            location.reload();
            return;
        }
        //#endregion Review Wizard

    });
});