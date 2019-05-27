sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("oem-customer.controller.BaseController", {

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

        getConfModel : function () {
            if (!this._confModel) {
                let oConfModel = new JSONModel({
                    "server" : {
                        "URL" : { 
                            "protocol" : "http:",
                            "hostname" : "",
                            "port" : "3000",
                            "path" : "Customer"
                        },
                        "methodes" : {
                            "sendSldLogin" : "Login",
                            "validateUserName" : "CheckUser={0}/OP={1}",
                            "saveUserData" : "saveCustomerData",
                            "getPartnerGeneralData" : "getPartnerGeneralData",
                            "getPartnerServiceLayerData" : "getPartnerServiceLayerData"
                        }
                    },
                    "nextPage" : "/TC-Customer/PartnerComplete.html"
                });
                this._confModel = this.getSetModel("conf", oConfModel);
            }
            return this._confModel;
        },

        getServerURL : function () {
            if (!this._serverURL) {
                var hostName = this.getConfModel().getProperty("/server/URL/hostname");
                if (!hostName) {
                    hostName = window.location.hostname;
                }
                
                this._serverURL = this.getConfModel().getProperty("/server/URL/protocol") + "//" + hostName
                        + (this.getConfModel().getProperty("/server/URL/port") ? ':' + this.getConfModel().getProperty("/server/URL/port") : '') + "/"
                        + this.getConfModel().getProperty("/server/URL/path") + "/";
            }
            return this._serverURL;
        },

        getRequestURL : function (methodKey) {
            let methodName = this.getConfModel().getProperty(methodKey);
            let reqURL = this.getServerURL() + methodName;
            return reqURL;
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
		}

    });

});