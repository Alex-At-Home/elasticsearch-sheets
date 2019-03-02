/*
 * ManagementService.gs - controls persistence of table configurations
 */

//TODO: keep adding more and more defaults to the table!

var ManagementService_ = (function(){

  // 1] Methods for manipulating the management service itself

  /** Using a sheet to store all the meta - the sheet name */
  function managementSheetName() {
     if (TestService_.inTestMode()) {
        return '__ES_TEST_MODE_ADDON_INTERNALS__'
     } else {
        return '__ES_ADDON_INTERNALS__'
     }
  }

  /** Has the management service been created? */
  function isManagementServiceCreated() {
    return null != getManagementService_()
  }

  /**
   * The first time ES add-on is launched for a given spreadsheet, builds the management sheet
   */
  function createManagementService(sourceConfig) {
    var ss = SpreadsheetApp.getActive()
    var currActive = ss.getActiveSheet()
    var currNumSheets = ss.getNumSheets()
    var newSheet = ss.insertSheet(managementSheetName(), currNumSheets)
    ss.setActiveSheet(currActive, /*restoreSelection=*/true)

    newSheet.getRange('a1').setValue('Elasticsearch URL:')
    newSheet.getRange('a2').setValue('Elasticsearch version:')
    newSheet.getRange('a3').setValue('Username:')
    newSheet.getRange('a4').setValue('Password:')
    newSheet.getRange('a5').setValue('Auth method:') //(user/pass, anonymous - in the future support oauth, prompt, SAML)
    newSheet.getRange('a6').setValue('Header JSON:')
    newSheet.getRange('a7').setValue('Client Options JSON:')
    newSheet.getRange('a8').setValue('Saved objects:')
    newSheet.autoResizeColumn(1)

    newSheet.getRange('e1').setValue('Enabled:')
    newSheet.getRange('e2').setValue('Query Trigger:')
    newSheet.getRange('e3').setValue('Query Trigger Interval (secs):')
    newSheet.autoResizeColumn(5)

    setEsMeta_(newSheet, sourceConfig)

    return newSheet;
  }

  /** Delete the management sheet (for testing only?) */
  function deleteManagementService() {
    var mgmtService = getManagementService_()
    if (null != mgmtService) {
      var ss = SpreadsheetApp.getActive()
      ss.deleteSheet(mgmtService)
      TableRangeUtils_.clearTableRanges(ss)
    }
  }

  // 2] Methods for manipulating the ES metadata stored in the management service

  /** Retrieves and formats the ES metadata */
  function getEsMeta() {
    var mgmtService = getManagementService_()

     var obj = {}
     obj.url = mgmtService.getRange('b1').getValue().toString()
     obj.version = mgmtService.getRange('b2').getValue().toString()

     obj.auth_type = mgmtService.getRange('b5').getValue().toString()
     if ("anonymous" == obj.auth_type) {
        obj.username = ""
        obj.password = ""
        obj.password_global = false
     } else { //(there will be others in the future)
        obj.username = mgmtService.getRange('b3').getValue().toString()
        obj.password = mgmtService.getRange('b4').getValue().toString()

        obj.password_global = ("" != obj.password)
        if (!obj.password_global) {
           var userProperties = PropertiesService.getUserProperties()
           obj.username =userProperties.getProperty(managementSheetName() + "username") || ""
           obj.password =userProperties.getProperty(managementSheetName() + "password") || ""
       }
     }

     try {
        obj.header_json = JSON.parse(mgmtService.getRange('b6').getValue())
     } catch (err) {
        obj.header_json = esMetaModel_.header_json
     }
     try {
        obj.client_options_json = JSON.parse(mgmtService.getRange('b7').getValue())
     } catch (err) {
        obj.client_options_json = esMetaModel_.client_options_json
     }
     obj.enabled = mgmtService.getRange('f1').getValue().toString().toLowerCase() != "false" //(ie default is true)
     obj.query_trigger = mgmtService.getRange('f2').getValue().toString()
     if (obj.query_trigger == "") {
        obj.query_trigger = esMetaModel_.query_trigger
     }
     var interval = parseInt(mgmtService.getRange('f3').getValue().toString() || "")
     if (!interval || (interval <= 0) || (interval == NaN)) {
       interval = esMetaModel_.query_trigger_interval_s
     }
     obj.query_trigger_interval_s = interval
     return obj
  }

  /** Fills in ES metadata - missing fields, means don't set (apart from grouped fields like auth_type/user/password/password_global) */
  function setEsMeta(esConfig) {
    var mgmtService = getManagementService_()
    setEsMeta_(mgmtService, esConfig)
  }

  // 3] Methods for manipulating the saved objects stored inside the management service

  /** Creates a saved object in the management service */
  function addSavedObject(name, configJson) {
    var mgmtService = getManagementService_()
    var firstBlankRow = savedObjectMinRow_ - 1
    var found = false
    while (!found) {
      firstBlankRow++
      found = ("" == mgmtService.getRange('a' + firstBlankRow).getValue())
    }
    var range = mgmtService
       .getRange('a' + firstBlankRow + ':' + 'c' + firstBlankRow) //(col 'c' will be to store temp objects in the future)
    range.setValues([ [ name, JSON.stringify(configJson, null, 3), "" ] ])

    return true
  }

  /** Updates an object (name stays the same) */
  function updateSavedObject(name, configJson) {
    var mgmtService = getManagementService_()
    var matchingRow = savedObjectMinRow_ - 1
    var found = false
    while (!found) {
      matchingRow++
      found = (name == mgmtService.getRange('a' + matchingRow).getValue())
    }
    if (found) {
        var range = mgmtService
           .getRange('a' + matchingRow + ':' + 'c' + matchingRow) //(col 'c' will be to store temp objects in the future)

        //(just unset a couple of temp fields, shouldn't be set here)
        delete configJson.temp
        delete configJson.name

        range.setValues([ [ name, JSON.stringify(configJson, null, 3), "" ] ])
       return true
    } else {
       return false
    }
  }

  /** Updates an object (name stays the same) - set configJson to null to unset */
  function updateTempSavedObject(name, tempName, configJson) {
    var mgmtService = getManagementService_()
    var matchingRow = savedObjectMinRow_ - 1
    var found = false
    while (!found) {
      matchingRow++
      found = (name == mgmtService.getRange('a' + matchingRow).getValue())
    }
    if (found) {
        var range = mgmtService
           .getRange('c' + matchingRow) //(col 'c' will be to store temp objects in the future)
        if (configJson) {
           if (tempName) {
              configJson.name = tempName //(insert name in case it's different)
           }
           range.setValue(JSON.stringify(configJson, null, 3))
        } else {
           range.setValue("")
        }
       return true
    } else {
       return false
    }
  }


  /** Deletes the entire row containing the saved object with the given name */
  function deleteSavedObject(name) {
    var mgmtService = getManagementService_()
    var firstRow = savedObjectMinRow_
    var lastRow = mgmtService.getLastRow()
    for (var i = firstRow; i <= lastRow; ++i) {
      var savedObjNameCell = mgmtService.getRange('a' + i)
      if (savedObjNameCell.getValue() == name) {
        mgmtService.deleteRow(i)
        return true
      }
    }
    return false
  }

  /** Retrieves a list of saved object from the management service */
  function listSavedObjects(discardRange) {
    var mgmtService = getManagementService_()

    var firstRow = savedObjectMinRow_
    var lastRow = mgmtService.getLastRow()

    var savedObjList = {}
    for (var i = firstRow; i <= lastRow; ++i) {
      var savedObjRow = mgmtService.getRange('a' + i + ':' + 'c' + i)
      try {
        var savedObjName = savedObjRow.getCell(1, 1).getValue()
        var savedObjStr = savedObjRow.getCell(1, 2).getValue()
        var tempObjStr = savedObjRow.getCell(1, 3).getValue()
        if ((savedObjName == ManagementService_.getDefaultKeyName()) && ("{}" == savedObjStr)) { // unless overridden explicity, use the most up-to-date defaults
           var savedObj = defaultTableConfig_
        } else {
           var savedObj = JSON.parse(savedObjStr)
        }
        if (tempObjStr) {
           savedObj.temp = JSON.parse(tempObjStr)
        }
        // Don't expose these parameters to the UI, they are retrieved/managed separately
        if (discardRange) {
          delete savedObj.range
          delete savedObj.sheet
        }
        savedObjList[savedObjName] = savedObj
      } catch (err) {
        showStatus("Error with [" + savedObjName + "] / [" + savedObjStr + "]: [" + err.message + "]", 'Server Error')
      }
    }
    return savedObjList
  }

  ////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////

  /** The key name used internally by both service and client to store the default table object described below */
  var defaultTableConfigKey_ = "d_e_f_a_u_l_t"

  /**
   * Retrieves the management sheet
   */
  function getManagementService_() {
    var ss = SpreadsheetApp.getActive()
    return ss.getSheetByName(managementSheetName())
  }

  /** Fills in ES metadata - missing fields, means don't set (apart from grouped fields like auth_type/user/password/password_global) */
  function setEsMeta_(mgmtService, esConfig) {
     if (esConfig.url) {
        mgmtService.getRange('b1').setValue(esConfig.url)
     }
     if (esConfig.version) {
        mgmtService.getRange('b2').setNumberFormat("@").setValue(esConfig.version)
     }
     var authType = esConfig.auth_type //(if authType is undefined then we don't perform any credenticals config)
     if ("anonymous" == (authType || "")) {
        mgmtService.getRange('b3').setValue("")
        mgmtService.getRange('b4').setValue("")
        var userProperties = PropertiesService.getUserProperties()
        userProperties.deleteProperty(managementSheetName() + "username")
        userProperties.deleteProperty(managementSheetName() + "password")
     } else if (authType) {
        var password = esConfig.password || ""
        if (esConfig.password_global || false) { //(password_global defaults to false)
           if (esConfig.username) {
              mgmtService.getRange('b3').setNumberFormat("@").setValue(esConfig.username)
           }
           if (password != "") {
              mgmtService.getRange('b4').setNumberFormat("@").setValue(password)
           } //(else leave password alone)
        } else {
           mgmtService.getRange('b3').setValue("")
           mgmtService.getRange('b4').setValue("")
           var userProperties = PropertiesService.getUserProperties()
           if (esConfig.username) {
              userProperties.setProperty(managementSheetName() + "username", esConfig.username)
           }
           if (password != "") {
              userProperties.setProperty(managementSheetName() + "password", password)
           }
        }
     }
     if (authType) {
        mgmtService.getRange('b5').setValue(authType)
     }
     if (esConfig.header_json) {
        mgmtService.getRange('b6').setValue(JSON.stringify(esConfig.header_json, null, 3))
     }
     if (esConfig.client_options_json) {
        mgmtService.getRange('b7').setValue(JSON.stringify(esConfig.client_options_json, null, 3))
     }
     if (esConfig.enabled) {
        mgmtService.getRange('f1').setValue(esConfig.enabled)
     }
     if (esConfig.query_trigger) {
        mgmtService.getRange('f2').setValue(esConfig.query_trigger)
     }
     if (esConfig.query_trigger_interval_s) {
        mgmtService.getRange('f3').setValue(esConfig.query_trigger_interval_s)
     }
  }

  /** (where the saved objects aka data tables start */
  var savedObjectMinRow_ = 9

  ////////////////////////////////////////////////////////

  return {
    isManagementServiceCreated: isManagementServiceCreated,
    createManagementService: createManagementService,
    deleteManagementService: deleteManagementService,
    managementSheetName: managementSheetName,

    getEsMeta: getEsMeta,
    setEsMeta: setEsMeta,

    addSavedObject: addSavedObject,
    updateSavedObject: updateSavedObject,
    updateTempSavedObject: updateTempSavedObject,
    deleteSavedObject: deleteSavedObject,
    listSavedObjects: listSavedObjects,

    getDefaultKeyName: function() { return defaultTableConfigKey_ },

    TESTONLY: {
    }
  }

}())
