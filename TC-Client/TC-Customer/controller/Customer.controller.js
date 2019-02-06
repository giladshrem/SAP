sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
    'sap/m/MessagePopover',
	'sap/m/MessageItem'
    ], function(BaseController, JSONModel, MessageBox, MessagePopover, MessageItem) {
        "use strict";

    return BaseController.extend("oem-customer.controller.Customer", {

        //#region Init

        onInit: function () {

            this.oFormData = {
                "companyName" : "",
                "customerReferenceNumber" : "",
                "country" : "",
                "IndPackageId" : null,
                "IndPackageName" : "",
                "contactFirstName" : "",
                "contactLastName" : "",
                "contactEmail" : "",
                "contactPhone" : "",
                "financialPeriods" : "Yearly",
                "startFiscalYear" : "2018-01-01",
                "UPNSuffix" : "",
                "Users" : [ ]
            };
            this._customerModel = new JSONModel(this.oFormData);
            this.getView().setModel(this._customerModel);
            this.UserRegex = /^[\w \-.]+$/;
        },

        onAfterRendering : function() {
            this._bundle = this.getView().getModel("i18n").getResourceBundle();
            let ver = this.getOwnerComponent().getManifestEntry("sap.app").applicationVersion.version;
            // Model used to manipulate control states
            this._viewData = {
                "userTableTitle" : this._bundle.getText("userTableTitle"),
                "version" : ver,
                "confirmButtonEnabled" : true,
                "isUPN" : true,
                "userMaxLength" : 20,
                "valueState" : {
                    "companyName" : "None",
                    "country" : "None",
                    "contactFirstName" : "None",
                    "contactLastName" : "None",
                    "contactEmail" : "None",
                    "contactPhone" : "None",
                    "startFiscalYear" : "None",
                    "UPNSuffix" : "None"
                },
                "messages" : [],
                "messagesLength" : 0,
                "messagesVisible" : false
            };
            this._viewModel = new JSONModel(this._viewData);
            this.getView().setModel(this._viewModel, "customerView");

            this.setUriParameters();

            this._countriesDataModel = this.getView().getModel("countries");
			this._countriesDataModel.setSizeLimit(this._countriesDataModel.oData.Countries.length);
            this._countriesDataModel.updateBindings(true);

            this.initMessagePopover();
        },
        
        setUriParameters : function () {
            let sPackage = jQuery.sap.getUriParameters().get("p");
            if (!sPackage) {
                sPackage = "0";
            }
            let iPackage = parseInt(sPackage);
            if (!isNaN(iPackage))
            {
                this._customerModel.setProperty("/IndPackageId", sPackage);
                if (iPackage > 0) {
                    this._customerModel.setProperty("/IndPackageName", sPackage);
                }
                this.getPartnerGeneralData({"packageId" : sPackage});
            }

            let sCRN = jQuery.sap.getUriParameters().get("crn");
            this._customerModel.setProperty("/customerReferenceNumber", sCRN);

            let sCompanyName = jQuery.sap.getUriParameters().get("cn");
            this._customerModel.setProperty("/companyName", sCompanyName);

            let sFirstName = jQuery.sap.getUriParameters().get("fn");
            this._customerModel.setProperty("/contactFirstName", sFirstName);

            let sLastName = jQuery.sap.getUriParameters().get("ln");
            this._customerModel.setProperty("/contactLastName", sLastName);

            let sEmail = jQuery.sap.getUriParameters().get("e");
            this._customerModel.setProperty("/contactEmail", sEmail);
                    
            let sPhone = jQuery.sap.getUriParameters().get("ph");
            this._customerModel.setProperty("/contactPhone", sPhone);
            
            let sMaxUsers = jQuery.sap.getUriParameters().get("mu");
            if (!sMaxUsers) {
                sMaxUsers = "0";
            }
            let iMaxUsers = parseInt(sMaxUsers);
            if (isNaN(iMaxUsers)) {
                iMaxUsers = 0;
            }
            this._customerModel.setProperty("/maxUsers", iMaxUsers);
        },

        addUserTableAggregation : function () {
            let oTemplate = new sap.m.ColumnListItem({
                type: sap.m.ListType.Active,
                cells : [
                    new sap.m.Input({
                        id : "username",
                        value : "{username}",
                        liveChange : function(oEvent){ 
                            this.usernameValidation(oEvent); 
                        }.bind(this),
                        valueState : "{usernameVS}",
                        valueStateText : "{usernameVST}",
                        placeholder : this._bundle.getText("usernamePlaceholder"),
                        required : true,
                        maxLength : this._viewModel.getProperty("/userMaxLength")
                    }),
                    new sap.m.Input({
                        id : "EmailUser",
                        value : "{EmailUser}",
                        liveChange : function(oEvent){ 
                            this.onLiveChangeEmailUser(oEvent); 
                        }.bind(this),
                        valueState : "{EmailUserVS}",
                        valueStateText : "{EmailUserVST}",
                        editable : "{EmailUserEditable}",
                        placeholder : this._bundle.getText("upnPlaceholder"),
                        required : true,
                        visible : this._viewModel.getProperty("/isUPN")
                    }),
                    new sap.m.Text({
                        id : "UserPrincipalName",
                        text : "{UserPrincipalName}",
                        visible : this._viewModel.getProperty("/isUPN")
                    }),
                    new sap.m.CheckBox({
                        selected: "{administrator}"
                    })
                ]
            });
            let oTable = this.byId('idUserTable');
            oTable.setModel(this._customerModel);
            oTable.bindAggregation("items","/Users",oTemplate);
        },

        getPartnerGeneralData : function (data) {
            let methodName = this.getConfModel().getProperty("/server/methodes/getPartnerGeneralData");
            let reqURL = this.getServerURL() + methodName;
			return $.ajax({
                url: reqURL,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data),
                success: function(result){
                    this.handleGetPartnerGeneralDataSuccess(result);
                }.bind(this),
                error: function(error) {
                    this.handleGetPartnerGeneralDataErrors(error);
                }.bind(this)
            });
        },

        handleGetPartnerGeneralDataSuccess : function (result) {
            if (this.isKeyOK(result, 'packageName', 'string')) {
                this._customerModel.setProperty("/IndPackageName", result.packageName);
            }

            if ((this.isKeyOK(result, 'SldVersion', 'string')) && (this.isLowerSldVersion(result.SldVersion, "1.10.SP00.PL12"))) {
                this._viewModel.setProperty("/isUPN", false);
            }

            if ((this.isKeyOK(result, 'Prefix', 'number')) && (result.Prefix > 0) &&
                (this.isKeyOK(result, 'Separator', 'string')) && (result.Separator.length > 0)) {
                this._viewModel.setProperty("/userMaxLength", 20 - result.Prefix - result.Separator.length);
            }

            this.addUserTableAggregation();
        },

        handleGetPartnerGeneralDataErrors : function (result) {
            MessageBox.error(this._bundle.getText("serverErrorMessage"));
        },

        //#endregion Init

        //#region MessagePopover

        initMessagePopover : function () {
        
            var oMessageTemplate = new MessageItem({
                type: '{type}',
                title: '{title}',
                subtitle: '{subtitle}',
                groupName: '{groupName}'
            });
        
            this._oMessagePopover = new MessagePopover({
                items: {
                    path: '/messages',
                    template: oMessageTemplate
                }
            });

            this._oMessagePopover._oMessageView.setGroupItems(true);
            this._oMessagePopover.setModel(this._viewModel);
        },

        addMessage : function (i_id, i_type, i_title, i_subtitle, i_groupName, isValueState) {
            let aMessages = this._viewModel.getProperty("/messages");
            let idx = aMessages.findIndex(x => x.id==i_id);
            if (idx == -1) {
                aMessages.push({
                    id : i_id,
                    type: i_type,
                    title: i_title,
                    subtitle: i_subtitle,
                    groupName: i_groupName
                });
            } else {
                aMessages[idx].type = i_type;
                aMessages[idx].title = i_title;
            }
            this._viewModel.setProperty("/messages", aMessages);
            this._viewModel.setProperty("/messagesLength", aMessages.length);
            this._viewModel.setProperty("/messagesVisible", true);
            if (isValueState) {
                this._viewModel.setProperty("/valueState/" + i_id, "Error");
            }
        },

        deleteMessage : function (i_id, isValueState) {
            let aMessages = this._viewModel.getProperty("/messages");
            let idx = aMessages.findIndex(x => x.id==i_id);
            if (idx >= 0) {
                aMessages.splice(idx, 1);
                this._viewModel.setProperty("/messages", aMessages);
                this._viewModel.setProperty("/messagesLength", aMessages.length);
                if (aMessages.length == 0) {
                    this._viewModel.setProperty("/messagesVisible", false);
                }
            }
            if (isValueState) {
                this._viewModel.setProperty("/valueState/" + i_id, "None");
            }
        },

        fixUserMessagesAfterDeleteRow : function (i_id, columnId) {
            let aMessages = this._viewModel.getProperty("/messages");
            for(let i = 0; i < aMessages.length; i++) {
                if (aMessages[i].id.startsWith(columnId)) {
                    if (parseInt(aMessages[i].id.replace(columnId, "")) > i_id) {
                        let newLine = parseInt(aMessages[i].id.replace(columnId, "")) - 1;
                        aMessages[i].id = columnId + newLine;
                        aMessages[i].subtitle = this._bundle.getText("messagePopoverSubtitleUsername", newLine)
                    }
                }
            }
            this._viewModel.setProperty("/messages", aMessages);
        },

        handleMessagePopoverPress: function (oEvent) {
			this._oMessagePopover.toggle(oEvent.getSource());
        },

        //#endregion MessagePopover

        //#region Validations

        getInputValue : function (oEvent, propertyPath) {
            let sValue;
			if (oEvent) {
				sValue = oEvent.getParameters().value;
			} else {
                sValue = this._customerModel.getProperty(propertyPath);
            }
            return sValue;
        },

        setRequiredFieldErrorMessage : function (isEmpty, i_id) {
            if (isEmpty) {
                this.addMessage(i_id, "Error", this._bundle.getText(i_id + "ValueStateText"), this._bundle.getText(i_id), 
                    this._bundle.getText("companyDetailsTitle"), true);
            } else {
                this.deleteMessage(i_id, true);
            }
        },

        validateInput : function (oEvent, i_id) {
            let sValue = this.getInputValue(oEvent, "/" + i_id);
            this.setRequiredFieldErrorMessage(!sValue, i_id);
        },

        validateCompanyName : function (oEvent) {
            this.validateInput(oEvent, "companyName");
        },

        validateCountry : function () {
            let id = "country";
            let sValue = this._customerModel.getProperty("/" + id);
            this.setRequiredFieldErrorMessage(((!sValue) || (sValue == "XX")), id);
        },

        validateContactFirstName : function (oEvent) {
            this.validateInput(oEvent, "contactFirstName");
        },

        validateContactLastName : function (oEvent) {
            this.validateInput(oEvent, "contactLastName");
        },

        validateContactEmail : function (oEvent) {
            this.validateInput(oEvent, "contactEmail");
        },

        validateContactPhone : function (oEvent) {
            this.validateInput(oEvent, "contactPhone");
        },

        validateStartFiscalYear : function (oEvent) {
            this.validateInput(oEvent, "startFiscalYear");
        },

        updateEmailUserEditable : function () {
            let aUsers = this._customerModel.getProperty("/Users");
            if (aUsers.length > 0) {
                for(var i = 0; i < aUsers.length; i++) {
                    if (this.isEmailUserEditable()) {
                        if (!aUsers[i].EmailUser) {
                            aUsers[i].EmailUser = aUsers[i].username;
                        }
                    } else {
                        aUsers[i].EmailUser = "";
                        aUsers[i].UserPrincipalName = "";
                    }
                    this.validateEmailUser(i, aUsers[i].EmailUser);
                    aUsers[i].EmailUserEditable = this.isEmailUserEditable();
                }
                this._customerModel.setProperty("/Users", aUsers);
            }
        },

        validateUPNSuffix : function (oEvent) {
            if (!this._viewModel.getProperty("/isUPN")) {
                return;
            }
            let upnSuffix = this.getInputValue(oEvent, "/UPNSuffix").trim();
			if (upnSuffix) {
                if (this.UserRegex.test(upnSuffix)) {
                    this.deleteMessage("UPNSuffix");
                    this._viewModel.setProperty("/valueState/UPNSuffix", "Success");
                } else {
                    this.addMessage("UPNSuffix", "Error", this._bundle.getText("UPNSuffixValueStateText"), this._bundle.getText("UPNSuffix"), 
                        this._bundle.getText("userInformationTitle"), true);
                }
            } else {
                this.deleteMessage("UPNSuffix", true);
            }
            this._customerModel.setProperty("/UPNSuffix", upnSuffix);
            this.updateEmailUserEditable();
        },

        usernameValidation : function (oEvent) {
            let newValue = oEvent.getParameters().value.trim();
            let idx = oEvent.getSource().getBindingContext().getPath().split("/")[2];
			if (!newValue) {
                this.setColumnValueState("username", idx, "Error", this._bundle.getText("usernameValueStateText"), this._bundle.getText("usernameValueStateText"));
			} else {
                if (this.UserRegex.test(newValue)) {
                    this.setColumnValueState("username", idx, "None", "", "");
                } else {
                    this.setColumnValueState("username", idx, "Error", this._bundle.getText("usernameValueStateTextChar"), this._bundle.getText("usernameErrorChar"));
                }
            }
            if (this.isEmailUserEditable()) {
                let oldValue = this._customerModel.getProperty("/Users/" + idx + "/username");
                let upnValue = this._customerModel.getProperty("/Users/" + idx + "/EmailUser");
                if (oldValue === upnValue) {
                    this._customerModel.setProperty("/Users/" + idx + "/EmailUser", newValue);
                    this.validateEmailUser(idx, newValue);
                }
                this._customerModel.setProperty("/Users/" + idx + "/username", newValue);
            }
        },
        
        serverUsernameValidation : function (idx, column) {
            let columnToValidate = column;
            if (column === "EmailUser") {
                columnToValidate = "UserPrincipalName";
            }
            let username = this._customerModel.getProperty("/Users/" + idx + "/" + columnToValidate);
            if ((!username) && (column === "EmailUser")) {
                this.setColumnValueState("EmailUser", idx, "Success", "", "");
                return;
            }
            let methodName = this.getConfModel().getProperty("/server/methodes/validateUserName");
            let reqURL = this.getServerURL() + methodName + "/" + username;
            $.ajax({
                url: reqURL,
                type: 'GET',
                success: function(result){
                    this.handleServerUsernameValidationSuccess(result, idx, column);
                }.bind(this),
                error: function(error) {
                    this.handleServerUsernameValidationError(error);
                }.bind(this)               
              }
            );
        },

        setColumnValueState(controlId, idx, valueState, valueStateText, errorMessage) {
            this._customerModel.setProperty("/Users/" + idx + "/" + controlId + "VST", valueStateText);
            this._customerModel.setProperty("/Users/" + idx + "/" + controlId + "VS", valueState);
            idx++;
            if (valueState == "Error") {
                this.addMessage(controlId + idx, valueState, errorMessage, 
                    this._bundle.getText("messagePopoverSubtitleUsername", idx), 
                    this._bundle.getText("userInformationTitle"), false);
            } else {
                this.deleteMessage(controlId + idx, false);
            }
        },

        handleServerUsernameValidationSuccess(result, idx, column) {
            let errorMessage = "", valueState = "None";
            if (result.hasOwnProperty('d')) { 
                if (result.d.CheckSystemUserExists) {
                    valueState = "Error";
                    errorMessage = this._bundle.getText(column + "AlreadyExists");
                } else {
                    valueState = "Success";
                }
            } else if (result.hasOwnProperty('errors')) {
                errorMessage = this.getUserErrorText(result.errors[0].errCode);
                valueState = "Error";
            } else {
                errorMessage = this._bundle.getText(column + "Error");
                valueState = "Error";
            }
            this.setColumnValueState(column, idx, valueState, errorMessage, errorMessage);
            if ((this.isServerUsersValidation("username") === 1) && (this.isServerUsersValidation("EmailUser") === 1)) {
                this.runConfirm();
            } else if ((this.isServerUsersValidation("username") === 0) || (this.isServerUsersValidation("EmailUser") === 0)) {
                this.showConfirmErrorMessage();
            }
        },

        getUserErrorText : function (errCode) {
			let textReturn = this._bundle.getText("usernameError");
			if (errCode) {
				let textId = "ErrorText" + errCode;
				textReturn = this._bundle.getText(textId);
				if (textId === textReturn) {
					textReturn = this._bundle.getText("usernameError");
				}
			}
			return textReturn;
        },
        
        handleServerUsernameValidationError(result) {
            if (this._AlreadyShowServerError) {
                return;
            }
            this._AlreadyShowServerError = true;
            MessageBox.error(this._bundle.getText("serverErrorMessage"));
        },

        runServerUsersValidation : function () {
            let aUsers = this._customerModel.getProperty("/Users");
            if (aUsers.length > 0) {
                for(var i = 0; i < aUsers.length; i++) {//Clear old validations
                    this.setColumnValueState("username", i, "None", "", "");
                    this.setColumnValueState("EmailUser", i, "None", "", "");
                }
                for(var i = 0; i < aUsers.length; i++) {
                    this.serverUsernameValidation(i, "username");
                    if (this.isEmailUserEditable()) {
                        this.serverUsernameValidation(i, "EmailUser");
                    }
                }
            } else {
                this.runConfirm();
            }
        },

        isUsersValidation : function () {
            let bValidation = true;
            let aUsers = this._customerModel.getProperty("/Users");
            for(var i = 0; i < aUsers.length; i++) {
                if (aUsers[i].usernameVS === "Error") {
                    bValidation = false;
                }
                if ((this.isEmailUserEditable()) && (aUsers[i].EmailUserVS === "Error")) {
                    bValidation = false;
                }
            }
            return bValidation;
        },

        //Check all server users validations results and returns:
        //-1 - Not all usernames have been checked.
        // 0 - At least one of the usernames didn't pass server validation.
        // 1 - All usernames have successfully passed the server test.
        isServerUsersValidation : function (column) {
            if ((column === "EmailUser") && (!this.isEmailUserEditable())) {
                return 1;
            }
            let vsColumn = column + "VS";
            let iReturn = -1;
            let bAllSuccess = true, bAllChecked = true;
            let aUsers = this._customerModel.getProperty("/Users");
            for(let i = 0; i < aUsers.length; i++) {
                if (aUsers[i][vsColumn] != "Success") {
                    bAllSuccess = false;
                    if (aUsers[i][vsColumn] != "Error") {
                        bAllChecked = false;
                    }
                }
            }
            if (bAllChecked) {
                if (bAllSuccess) {
                    iReturn = 1;
                } else {
                    iReturn = 0;
                }
            }
            return iReturn;
        },

        onLiveChangeEmailUser : function (oEvent) {
            let upn = oEvent.getParameters().value.trim();
            let idx = oEvent.getSource().getBindingContext().getPath().split("/")[2];
            this.validateEmailUser(idx, upn);
        },

        validateEmailUser : function (idx, upn) {
            if (!upn) {
                this._customerModel.setProperty("/Users/" + idx + "/UserPrincipalName", "");
			} else {
                if (this.UserRegex.test(upn)) {
                    this.setColumnValueState("EmailUser", idx, "None", "", "");
                } else {
                    this.setColumnValueState("EmailUser", idx, "Error", this._bundle.getText("upnValueStateTextChar"), this._bundle.getText("upnValueStateTextChar"));
                }
                if (this.isEmailUserEditable()) {
                    this._customerModel.setProperty("/Users/" + idx + "/UserPrincipalName", upn + "@" + this._customerModel.getProperty("/UPNSuffix"));
                }
            }
        },

        isRequiredValidation : function () {
            this.validateCompanyName();
            this.validateCountry();
            this.validateContactFirstName();
            this.validateContactLastName();
            this.validateContactEmail();
            this.validateContactPhone();
            this.validateStartFiscalYear();
            return ((this._viewModel.getProperty("/valueState/companyName") === "None") &&
                (this._viewModel.getProperty("/valueState/country") === "None") &&
                (this._viewModel.getProperty("/valueState/contactFirstName") === "None") &&
                (this._viewModel.getProperty("/valueState/contactLastName") === "None") &&
                (this._viewModel.getProperty("/valueState/contactEmail") === "None") &&
                (this._viewModel.getProperty("/valueState/contactPhone") === "None") &&
                (this._viewModel.getProperty("/valueState/startFiscalYear") === "None"));
        },

        //#endregion Validations

        //#region Users Table

        isEmailUserEditable : function () {
            return (this._viewModel.getProperty("/valueState/UPNSuffix") === "Success");
        },

        onAddRow: function() {
            let aUsers = this._customerModel.getProperty("/Users");
            if ((this._customerModel.getProperty("/maxUsers") > 0) && (aUsers.length >= this._customerModel.getProperty("/maxUsers"))) {
                MessageBox.alert(this._bundle.getText("UsersExceededMaximumMessage"));
                return;
            }

            aUsers.push({
                username : "", 
                EmailUser : "",
                UserPrincipalName : "",
                administrator : false, 
                validation : "I",
                usernameVS : "Error",
                usernameVST : this._bundle.getText("usernameValueStateText"),
                EmailUserEditable : this.isEmailUserEditable(),
                EmailUserVS : "Error",
                EmailUserVST : this._bundle.getText("upnValueStateText")
            });
            this._customerModel.setProperty("/Users", aUsers);
            this.setColumnValueState("username", aUsers.length - 1, "Error", this._bundle.getText("usernameValueStateText"), this._bundle.getText("usernameValueStateText"));
            if (this.isEmailUserEditable()) {
                this.setColumnValueState("EmailUser", aUsers.length - 1, "None", "", "");
            }
        },
        
        onDeleteRow: function(e) {
            var idx = e.getParameter('listItem').getBindingContext().getPath().split("/")[2];
            var aUsers = this._customerModel.getProperty("/Users");
            aUsers.splice(idx, 1);
            this._customerModel.setProperty("/Users", aUsers);
            idx++;
            this.deleteMessage("username" + idx, false);
            this.deleteMessage("EmailUser" + idx, false);
            this.fixUserMessagesAfterDeleteRow(idx, "username");
            this.fixUserMessagesAfterDeleteRow(idx, "EmailUser");
        },

        onUpdateFinished : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this._bundle.getText("userTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this._bundle.getText("userTableTitle");
            }
            this._viewData.userTableTitle = sTitle;
            this._viewModel.refresh();
        },
        
        //#endregion Users Table

        //#region Confirm

        onConfirm : function () {
            this._AlreadyConfirmed = false;
            this._AlreadyShowConfirmError = false;
            this._AlreadyShowServerError = false;
            if ((!this.isUsersValidation()) || (!this.isRequiredValidation())) {
                this.showConfirmErrorMessage();
                return;
            }
            this.runServerUsersValidation();
        },

        showConfirmErrorMessage : function () {
            if (this._AlreadyShowConfirmError) {
                return;
            }
            this._AlreadyShowConfirmError = true;
            MessageBox.error(this._bundle.getText("confirmErrorMessage"), {
                onClose: function() {
                    this.byId("idMessagePopover").firePress();
                }.bind(this)
            });
        },

    	runConfirm : function () {
            if (this._AlreadyConfirmed) {
                return;
            }
            this._AlreadyConfirmed = true;
            this.setUserDataForServer();
            let methodName = this.getConfModel().getProperty("/server/methodes/saveUserData");
            let reqURL = this.getServerURL() + methodName;
            $.ajax({
                url: reqURL,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(this._customerModel.oData),
                success: function(result){
                    this.handleConfirmSuccess(result);
                }.bind(this),
                error: function(error) {
                    this.handleConfirmError(error);
                }.bind(this)               
              });
        },
        
        setUserDataForServer : function () {
            let aUsers = this._customerModel.getProperty("/Users");

            for(let i = 0; i < aUsers.length; i++) {
                if (aUsers[i].usernameVS == "Error") {
                    bValidation = false;
                }
                switch(aUsers[i].usernameVS) {
					case "Error":
                        aUsers[i].validation = "N";
                        break;
                    case "Success":
                        aUsers[i].validation = "Y";
                        break;
                    default:
                        aUsers[i].validation = "I";
                }
            }
            this._customerModel.setProperty("/Users", aUsers);
        },

        handleConfirmSuccess(result) {
            let nextPage = this.getConfModel().getProperty("/nextPage");;
            window.location = nextPage;
        },

        handleConfirmError(result) {
            MessageBox.error(this._bundle.getText("serverErrorMessage"));
        }

        //#endregion Confirm

    });
});