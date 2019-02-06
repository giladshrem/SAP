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
			this.getRouter().getRoute("publicCloud").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched : function() {
			this.onPageLoad();
		},
        
        initLocals : function() {
            this._bundle = this.getModel("i18n").getResourceBundle();
            this.setModel(new JSONModel({}), "publicCloudCombo");
            this._publicCloudComboModel = this.getModel("publicCloudCombo");
            this.setModel(new JSONModel({}), "publicCloudData");
            this._publicCloudDataModel = this.getModel("publicCloudData");

            // Model used to manipulate control states
            var oViewModel = new JSONModel({
                "SaveButtonVisible" : false
            });
			this.setModel(oViewModel, "publicCloudView");
            this._viewModel = this.getModel("publicCloudView");

        },

        onPageLoad : function() {
            if (!this._publicCloudDataModel) {
				this.initLocals();
            }

            this.getPartnerCombos();
        },

        //#endregion Init

        //#region Get Public Cloud Data

        getPartnerCombos : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getPartnerCombos");
            let reqURL = this.getServerURL() + methodName;
            return $.ajax({
                url: reqURL,
                type: 'GET',
                dataType: 'json',
            }).then(function(result){
                jQuery.sap.log.debug(JSON.stringify(result));
                this.setPartnerCombos(result);
            }.bind(this), function(error) {
                jQuery.sap.log.error(error);              
            });
        },
        
        setPartnerCombos : function (data) {
            var tempData = {};
            tempData.Resellers = data.resellers.d.results;
            this._publicCloudComboModel.setData(tempData);
            this._publicCloudComboModel.refresh();
            this.getPublicCloudData();
            // this.runValidation();
        },

        getPublicCloudData : function () {
            let methodName = this.getConfModel().getProperty("/server/methodes/getPublicCloudData");
            let reqURL = this.getServerURL() + methodName;
            return $.ajax({
                url: reqURL,
                type: 'GET',
                dataType: 'json'
            }).then(function(result){
                this.setPublicCloudData(result);
            }.bind(this), function(error) {
                jQuery.sap.log.error(error);
            });
        },
        
        setPublicCloudData : function (data) {
            var tempData = {};
            tempData.DomainName = data.domain.d.GetDomainName;
            if (data.reseller.length > 0) {
                tempData.Reseller_Id = data.reseller[0].Reseller_Id;
            } else {
                tempData.Reseller_Id = -1;
            }

            this._publicCloudDataModel.setData(tempData);
            this._publicCloudDataModel.refresh();
            // this.runValidation();
        },

        //#endregion Get Public Cloud Data

        onChangeReseller : function (){
            this._viewModel.setData({"SaveButtonVisible" : true}, true);
            this._viewModel.refresh();
        },

        //#region Save Data

        onSave : function () {
            this.saveData(this._publicCloudDataModel.oData);
        },

        saveData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/savePublicCloudData");
            let reqURL = this.getServerURL() + methodName;
            return $.ajax({
                url: reqURL,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data)
            }).then(function(result){
                    this.handleSaveSuccess(result);
                }.bind(this), function(result) {
                    this.handleSaveErrors(result);
                    }.bind(this));
        },

        handleSaveErrors : function (result) {
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
                msg = this._bundle.getText("PublicCloudSaveError");
            }
            MessageBox.error(msg);
        },

        handleSaveSuccess : function (result) {
            var msg = this._bundle.getText("PublicCloudSaveSuccess");
            MessageToast.show(msg);
        },

        //#endregion Save Data
    });
});