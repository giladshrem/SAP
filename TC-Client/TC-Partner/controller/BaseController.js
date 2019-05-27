sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"sap/m/MessageBox"
], function (Controller, JSONModel, FlexibleColumnLayoutSemanticHelper, MessageBox) {
    "use strict";

    return Controller.extend("oem-partner.controller.BaseController", {

        /**
         * Convenience method for accessing the router.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter : function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        /**
         * Convenience method for getting the view model by name.
         * @public
         * @param {string} [sName] the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel : function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel : function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getSetModel : function (sName, oModel) {
            if (!oModel) {
                oModel = new JSONModel({});
            }
            this.setModel(oModel, sName);
            return this.getModel(sName);
        },

        // Returns true if a value is a string
        isString : function (value) {
            return typeof value === 'string';
        },

        // Returns true if a value is a object
        isObject : function (value) {
            return typeof value === 'object';
        },

        isKeyOK : function (oJSON, sKey, sType) {
            return ((oJSON.hasOwnProperty(sKey)) && (typeof oJSON[sKey] === sType));
        },

        isErrorOK : function (oJSON) {
            return ((this.isKeyOK(oJSON, 'errors', 'object')) && (oJSON.errors.length > 0) && (this.isKeyOK(oJSON.errors[0], 'errCode', 'number')));
        },

        getConfModel : function () {
            if (!this._confModel) {
                let oConfModel = new JSONModel({
                    "server" : {
                        "URL" : {
                            "protocol" : "http:",
                            "hostname" : "10.55.179.206",
                            "port" : "3000"
                        },
                        "methodes" : {
                            "getSetupData" : "partner/getsetupdata",
                            "saveSldUrl" : "partner/saveSldURL",
                            "saveSetupData" : "partner/setup",
                            "acs" : "partner/acs",
                            "sendSldLogin" : "partner/Login",
                            "getServiceLayerData" : "partner/getSLdata",
                            "sendServiceLayerLogin" : "partner/saveSLdata",
                            "getPartnerData" : "partner/getPartnerData",
                            "getPartnerCombos" : "partner/allParameters",
                            "getLocalSettingCombos" : "partner/serviceunit={0}/LS={1}",
                            "savePartnerData" : "partner/savePartnerData",
                            "getPublicCloudData" : "partner/getPublicCloudData",
                            "savePublicCloudData" : "partner/savePublicCloudData",
                            "getSolutionPackageContent" : "partner/getSolutionPackageContent",
                            "saveEmailPassword" : "partner/saveForeignEmailData",
                            "getTenantsHistory" : "activity/getTenantsHistory",
                            "getCustomerData" : "activity/getCustomerData"
                        }
                    },
                    "customer" : {
                        "page" : "/TC-Customer/PartnerBefore.html",
                        "demoPage" : "/B1Microsite/bank/index.html"
                    }
                });
                this._confModel = this.getSetModel("conf", oConfModel);
            }

            return this._confModel;
        },

        getServerURL : function () {
            if (!this._serverURL) {
                let hostName = this.getConfModel().getProperty("/server/URL/hostname");
                if (!hostName) {
                    hostName = window.location.hostname;
                }
                let protocol = this.getConfModel().getProperty("/server/URL/protocol");
                if (protocol) {
                    this._serverURL = protocol + "//" + hostName
                        + (this.getConfModel().getProperty("/server/URL/port") ? ':' + this.getConfModel().getProperty("/server/URL/port") : '') + "/";
                } else {
                    MessageBox.error("There seems to be a problem in loading this page. Please refresh the page from the browser menu.");
                }
            }
            return this._serverURL;
        },

        getErrorText : function (errCode) {
			let textReturn = this._bundle.getText("NoErrorMessage");
			if (errCode) {
				let textId = "ErrorText" + errCode;
				textReturn = this._bundle.getText(textId);
				if (textId === textReturn) {
					textReturn = this._bundle.getText("NoErrorMessage");
				}
			}
			return textReturn;
        },

        getErrorTextUser : function (errCode) {
			let textReturn = "";
			if (errCode) {
				let textId = "ErrorTextUser" + errCode;
				textReturn = this._bundle.getText(textId);
				if (textId === textReturn) {
					textReturn = "";
				}
			}
			return textReturn;
        },

        setSessionCookie : function (cValue) {
            document.cookie = "JSESSIONID=" + cValue + ";" + ";path=/";
        },

        isSamlRequest : function (data) {
            return ((this.isKeyOK(data, 'result', 'object')) && (this.isKeyOK(data.result, 'SAML', 'string')));
        },

        handleSsoRequest : function (data) {
            if ((this.isKeyOK(data, 'cookie', 'object')) && (this.isKeyOK(data.cookie, 'JSESSIONID', 'string'))) {
                this.setSessionCookie(data.cookie.JSESSIONID);
            }
            let samlRequest = data.result.SAML;
            let decodedRequest = window.atob(samlRequest);
            let startIndex = decodedRequest.indexOf('Destination="') + 'Destination="'.length;
            let endIndex = decodedRequest.indexOf('"', startIndex);
            let destination = decodedRequest.substr(startIndex, endIndex - startIndex);
            let acs = 'AssertionConsumerServiceURL="' + this.getServerURL() + this.getConfModel().getProperty("/server/methodes/acs") + '"';
            let issuer = "<ns2:Issuer>" + window.location.href + "</ns2:Issuer>";
            decodedRequest = decodedRequest.replace('AssertionConsumerServiceURL=""', acs);
            decodedRequest = decodedRequest.replace("<ns2:Issuer/>", issuer);
            let newSamlRequest = window.btoa(decodedRequest);
            this.ssoRequest(newSamlRequest, destination);
        },

        ssoRequest : function (samlRequest, destination) {
            let form = document.createElement("form");
            form.setAttribute("method", "post");
            form.setAttribute("action", destination);
            
            let hiddenField1 = document.createElement("input");
            hiddenField1.setAttribute("type", "hidden");
            hiddenField1.setAttribute("name", "SAMLRequest");
            hiddenField1.setAttribute("value", samlRequest);
            form.appendChild(hiddenField1);
            
            let hiddenField2 = document.createElement("input");
            hiddenField2.setAttribute("type", "hidden");
            hiddenField2.setAttribute("name", "RelayState");
            hiddenField2.setAttribute("value", "ROLE_ADMIN");
            form.appendChild(hiddenField2);
            
            document.body.appendChild(form);
            form.submit();
        },

    });

});