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
                "dbSetupStepValidated" : false,
                "sldSetupStepValidated" : false,
                "ServiceLayerSetupStepValidated" : false,
                "ConnectDbButtonVisible" : false,
                "LoginSldButtonVisible" : false,
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

        //#region DB Setup Model

        getSetupData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getSetupData");
			let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'GET',
				dataType: 'json'
			}).then(function(result){
					this.setSetupData(result);
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

        setSetupData : function (data) {
            let tempData = {};
            tempData.server = data.server;
            tempData.port = data.port;
            tempData.user = data.user;
            tempData.password = "xxxxxx";
            this._setupDataModel.setData(tempData);
            this.runDbFormValidation();
        },

        //#endregion DB Setup Model

        //#region Save DB Setup Data

        onConnectDB : function () {
            this.saveSetupData(this._setupDataModel.oData);
        },

        saveSetupData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/saveSetupData");
            let reqURL = this._serverURL + methodName;
            jQuery.sap.log.debug(JSON.stringify(data));
			return $.ajax({
                url: reqURL,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
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

        handleSaveSetupSuccess : function (result) {
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
                    this.getSldData();
                }
            }
        },

        setDbButtons : function (NextStep, ConnectDb) {
            this._viewModel.setProperty("/dbSetupStepValidated", NextStep);
            this._viewModel.setProperty("/ConnectDbButtonVisible", ConnectDb);
        },

        //#endregion DB Setup Validations

        //#region SLD Setup Model

		getSldData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getSldData");
			let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'GET',
				dataType: 'json'
			}).then(function(result){
					this.setSldData(result);
				}.bind(this), function(error) {
					this.handleGetSldDataErrors(error);
                }.bind(this));
		},

        setSldData : function (data) {
            let tempData = {};
            tempData.SldUrl = "";
            tempData.SldUserName = "";
            tempData.SldPassword = "xxxxxx";
            if (this.isKeyOK(data, 'slddata', 'object')) {
                tempData.SldUrl = data.slddata.SldUrl;
                tempData.SldUserName = data.slddata.SldUserName;
            }
            this._sldDataModel.setData(tempData);
            this.runSldFormValidation();
            this.setDbButtons(true, false);
        },

        handleGetSldDataErrors : function (result) {
            this.setDbButtons(false, true);
            let msg;
            if (result.status) {
                switch(result.status) {
                    case 503:
                        msg = this._bundle.getText("ServerError503");
                        break;
                    default:
                        msg = this._bundle.getText("ServerError503");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
        },
        
        //#endregion SLD Setup Model

        //#region SLD Setup Validations

        validateSldUrl : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._sldDataModel.setProperty("/SldPassword", "");
                this._viewModel.setProperty("/SldPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._sldDataModel.getProperty("/SldUrl");
			}
            if (!sValue) {
                this._viewModel.setProperty("/SldUrlVS", "Error");
            } else {
                this._viewModel.setProperty("/SldUrlVS", "None");
            }
            if (oEvent) {
                this.sldFormValidation(false);
            }
        },

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
                this.sldFormValidation(false);
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
                this.sldFormValidation(false);
            }
        },

        runSldFormValidation : function () {
            this.validateSldUrl();
            this.validateSldUserName();
            this.validateSldPassword();
            this.sldFormValidation(true);
        },

        sldFormValidation : function (isInnerEvent) {
            let bValidation = ((this._viewModel.getProperty("/SldUrlVS") === "None") &&
                (this._viewModel.getProperty("/SldUserNameVS") === "None") &&
                (this._viewModel.getProperty("/SldPasswordVS") === "None"));
            if (isInnerEvent) {
                if (bValidation) {
                    this.getPartnerCombos();
                }
            } else {
                this.setSldButtons(false, bValidation);
            }
        },

        setSldButtons : function (NextStep, SldLogin) {
            this._viewModel.setProperty("/sldSetupStepValidated", NextStep);
            this._viewModel.setProperty("/LoginSldButtonVisible", SldLogin);
        },

        //#endregion SLD Setup Validations

        //#region SLD Login

        onSldLogin : function () {
            this.checkSldLogin(this._sldDataModel.oData);
        },

        checkSldLogin : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/sendSldLogin");
            let reqURL = this._serverURL + methodName;
			return $.ajax({
                url: reqURL,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data)
			}).then(function(result){
                    this.handleSldLoginSuccess(result);
				}.bind(this), function(error) {
                    this.handleSldLoginErrors(error);
                 }.bind(this));
        },
        
        handleSldLoginSuccess : function (result) {
            let msg = this._bundle.getText("SLDStepSuccessMessage");
            MessageToast.show(msg);
            this.setSldButtons(true, false);
        },

        handleSldLoginErrors : function (result) {
            this.setSldButtons(false, true);
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

        //#endregion SLD Login

        //#region Get Partner Combos

        getPartnerCombos : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getPartnerCombos");
            let reqURL = this.getServerURL() + methodName;
            return $.ajax({
                url: reqURL,
                type: 'GET',
                dataType: 'json'
            }).then(function(result){
                    this.handleGetPartnerCombosSuccess(result);
                }.bind(this), function(error) {
                    this.handleGetPartnerCombosErrors(error);
                }.bind(this));
        },
        
        handleGetPartnerCombosSuccess : function (data) {
            this.setSldButtons(true, false);
        },

        handleGetPartnerCombosErrors : function (result) {
            this.setSldButtons(false, true);
            let msg;
            if (result.status) {
                switch(result.status) {
                    default:
                        msg = this._bundle.getText("SendSldLoginError404");
                }
            } else {
                msg = this._bundle.getText("GeneralServerError");
            }
            MessageBox.error(msg);
        },

        //#endregion Get Partner Combos

        //#region Service Layer Setup Model

        onActivateServiceLayerStep : function () {
            this.getServiceLayerData();
        },

		getServiceLayerData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getServiceLayerData");
			let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'GET',
				dataType: 'json'
			}).then(function(result){
					this.handleGetServiceLayerDataSuccess(result);
				}.bind(this), function(error) {
					this.handleGetServiceLayerDataErrors(error);
                }.bind(this));
        },
        
        handleGetServiceLayerDataSuccess : function (data) {
            if (this.isKeyOK(data, 'result', 'object')) {
                if (data.result[0].SLURL) {
                    let tempData = {};
                    tempData.ServiceLayerUrl = data.result[0].SLURL;
                    tempData.ServiceLayerUserName = data.result[0].SLUserName;
                    tempData.ServiceLayerPassword = "xxxxxx";
                    this._viewModel.setProperty("/ServiceLayerButtonText", this._bundle.getText("TestURLButton"));
                    this._viewModel.setProperty("/IsServiceLayer", true);
                    this._serviceLayerDataModel.setData(tempData);
                    this.runServiceLayerFormValidation();
                } else {
                    this.toggleServiceLayerDisable(false);
                    this.setServiceLayerButtons(true, false);
                }
            }
        },

        handleGetServiceLayerDataErrors : function (result) {
            let msg = this._bundle.getText("GeneralServerError");
            MessageBox.error(msg);
        },

        //#endregion Service Layer Setup Model

        //#region Service Layer Setup Validations

        onSelectIsServiceLayer : function(oEvent) {
            this.toggleServiceLayerDisable(this._viewModel.getProperty("/IsServiceLayer"));
        },

        toggleServiceLayerDisable : function (isServiceLayer) {
            this._viewModel.setProperty("/IsServiceLayer", isServiceLayer);
            this._serviceLayerDataModel.setProperty("/ServiceLayerUrl", "");
            this._viewModel.setProperty("/ServiceLayerUrlVS", "None");
            this._serviceLayerDataModel.setProperty("/ServiceLayerUserName", "");
            this._viewModel.setProperty("/ServiceLayerUserNameVS", "None");
            this._serviceLayerDataModel.setProperty("/ServiceLayerPassword", "");
            this._viewModel.setProperty("/ServiceLayerPasswordVS", "None");
            if (isServiceLayer) {
                this._viewModel.setProperty("/ServiceLayerButtonText", this._bundle.getText("TestURLButton"));
                this.runServiceLayerFormValidation();
            } else {
                this._viewModel.setProperty("/ServiceLayerButtonText", this._bundle.getText("SaveButton"));
                this.setServiceLayerButtons(false, true);
            }
        },

        validateServiceLayerUrl : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._serviceLayerDataModel.setProperty("/ServiceLayerPassword", "");
                this._viewModel.setProperty("/ServiceLayerPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._serviceLayerDataModel.getProperty("/ServiceLayerUrl");
			}
            if (!sValue) {
                this._viewModel.setProperty("/ServiceLayerUrlVS", "Error");
            } else {
                this._viewModel.setProperty("/ServiceLayerUrlVS", "None");
            }
            if (oEvent) {
                this.serviceLayerFormValidation(false);
            }
        },

        validateServiceLayerUserName : function (oEvent) {
			let sValue;
			if (oEvent) {
                this._serviceLayerDataModel.setProperty("/ServiceLayerPassword", "");
                this._viewModel.setProperty("/ServiceLayerPasswordVS", "Error");
				sValue = oEvent.getParameters().value;
			} else {
				sValue = this._serviceLayerDataModel.getProperty("/ServiceLayerUserName");
			}
            if (!sValue) {
                this._viewModel.setProperty("/ServiceLayerUserNameVS", "Error");
            } else {
                this._viewModel.setProperty("/ServiceLayerUserNameVS", "None");
            }
            if (oEvent) {
                this.serviceLayerFormValidation(false);
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
                this.serviceLayerFormValidation(false);
            }
        },

        runServiceLayerFormValidation : function () {
            this.validateServiceLayerUrl();
            this.validateServiceLayerUserName();
            this.validateServiceLayerPassword();
            this.serviceLayerFormValidation(true);
        },

        serviceLayerFormValidation : function (isInnerEvent) {
            let bValidation = ((this._viewModel.getProperty("/ServiceLayerUrlVS") === "None") &&
                (this._viewModel.getProperty("/ServiceLayerUserNameVS") === "None") &&
                (this._viewModel.getProperty("/ServiceLayerPasswordVS") === "None"));
            if (isInnerEvent) {
                this.setServiceLayerButtons(bValidation, bValidation);
            } else {
                this.setServiceLayerButtons(false, bValidation);
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
                "SLUrl": serviceLayerData.ServiceLayerUrl,
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
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data)
			}).then(function(result){
                    this.handleServiceLayerLoginSuccess(result);
				}.bind(this), function(error) {
                    this.handleServiceLayerLoginErrors(error);
                 }.bind(this));
        },
        
        handleServiceLayerLoginSuccess : function (result) {
            if (!this._serviceLayerDataModel.getProperty("/ServiceLayerUrl"))
            {//When saving empty Service Layer Url the error code is not relevant.
                this.setServiceLayerButtons(true, false);
                return;
            }
            let errors;
            if (this.isErrorOK(result)) {
                errors = result.errors;
            }
            if (errors[0].errCode > 0) {
                this._viewModel.setProperty("/ServiceLayerUrlVS", "Error");
                MessageBox.error(this._bundle.getText("ServiceLayerStepErrorMessage"));
                return;
            }
            let isURLok = false;
            if (this.isKeyOK(result, 'result', 'object')) {
                isURLok = result.result.isURLok;
                if (isURLok) {
                    MessageToast.show(this._bundle.getText("ServiceLayerStepSuccessMessage"));
                    this.setServiceLayerButtons(true, false);
                    return;
                }
            }
            MessageBox.error(this._bundle.getText("ServiceLayerStepErrorMessage"));
            this.setServiceLayerButtons(true, false);
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

		_handleNavigationToStep : function (iStepNumber) {
			let fnAfterNavigate = function () {
				this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this.backToWizardContent();
		}
        
        //#endregion Review Wizard

    });
});