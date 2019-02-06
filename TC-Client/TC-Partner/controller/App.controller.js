sap.ui.define([
        './BaseController',
        'jquery.sap.global',
        'sap/ui/core/mvc/Controller',
        'sap/m/Button',
        'sap/ui/Device',
        "sap/ui/model/json/JSONModel"
    ], function (BaseController,
        jQuery,
        Controller,
        Button,
        Device, JSONModel) {

            "use strict";
    
            return BaseController.extend("oem-partner.controller.App", {
    
                _bExpanded: true,
    
                onInit: function() {
                    this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    
                    // if the app starts on desktop devices with small or meduim screen size, collaps the sid navigation
                    if (Device.resize.width <= 1024) {
                        this.onSideNavButtonPress();
                    }
                    Device.media.attachHandler(function (oDevice) {
                        if ((oDevice.name === "Tablet" && this._bExpanded) || oDevice.name === "Desktop") {
                            this.onSideNavButtonPress();
                            // set the _bExpanded to false on tablet devices
                            // extending and collapsing of side navigation should be done when resizing from
                            // desktop to tablet screen sizes)
                            this._bExpanded = (oDevice.name === "Desktop");
                        }
                    }.bind(this));
                    var ver = this.getOwnerComponent().getManifestEntry("sap.app").applicationVersion.version;
                    var oViewModel = new JSONModel({
                        version : ver
                    });
                    this.setModel(oViewModel);
                },

                onItemSelect: function(oEvent) {
                    var oItem = oEvent.getParameter('item');
                    var sKey = oItem.getKey();

                    // if the device is phone, collaps the navigation side of the app to give more space
                    if (Device.system.phone) {
                        this.onSideNavButtonPress();
                    }
                    if (sKey=="customer") {
                        var customerPage = this.getConfModel().getProperty("/customer/page");
                        window.open(customerPage);
                    } else {
                        this.getRouter().navTo(sKey);
                    }
                },

                onSideNavButtonPress: function() {
                    var oToolPage = this.byId("app");
                    var bSideExpanded = oToolPage.getSideExpanded();
                    this._setToggleButtonTooltip(bSideExpanded);
                    oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
                },

                _setToggleButtonTooltip : function(bSideExpanded) {
                    var oToggleButton = this.byId('sideNavigationToggleButton');
                    if (bSideExpanded) {
                        oToggleButton.setTooltip('Large Size Navigation');
                    } else {
                        oToggleButton.setTooltip('Small Size Navigation');
                    }
                }
                
		});
	});

