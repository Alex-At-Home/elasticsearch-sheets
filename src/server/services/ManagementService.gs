/*
 * ManagementService.gs - controls persistence of table configurations
 */

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

  /** Returns the overall trigger policy */
  function getEsTriggerPolicy() {
    var mgmtService = getManagementService_()
    return mgmtService.getRange('f2').getValue() || "timed_content"
  }

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
       .getRange('a' + firstBlankRow + ':' + 'e' + firstBlankRow)
        //(col 'c' stores temp objects)
        //(col 'd' reveals a tables update status)
        //(col 'e' is the time it was last updated)
    var tableChangeUnlessDefaultObj =
      (defaultTableConfigKey_ == name) ? "" : "config_change" //(this is the default object being created)
    range.setValues([ [ name, jsonOrEncoded_(name, configJson), "", tableChangeUnlessDefaultObj, TableRangeUtils_.formatDate() ] ])

    return true
  }

  /** Updates the trigger state of a saved object */
  function setSavedObjectTrigger(name, trigger) {
    var mgmtService = getManagementService_()
    var matchingRow = savedObjectMinRow_ - 1
    var found = false
    while (!found) {
      matchingRow++
      found = (name == mgmtService.getRange('a' + matchingRow).getValue())
    }
    if (found) {
        var range = mgmtService
           .getRange('d' + matchingRow + ':' + 'e' + matchingRow)
        var curr = range.getValue()
        var doUpdate = true
        if ("" != trigger) { //(always overwrite)
          switch (curr) { // don't overwrite a change of higher applicability
            case "manual":
              trigger = "manual" //nothing can overwrite manual (except "")
              break
            case "config_change": //(everything except data_change overwrites)
              trigger = ("content_change" == trigger) ? curr : trigger
              break
            default: //("" or "content_change" - always update)
              break
          }
        }
        //(update the date anyway)
        var dateOrClear = trigger ? TableRangeUtils_.formatDate() : ""
        range.setValues([ [ trigger, dateOrClear ] ])
    }
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
           .getRange('a' + matchingRow + ':' + 'e' + matchingRow)
           //(see above for col descriptions)

        //(just unset a couple of temp fields, shouldn't be set here)
        delete configJson.temp
        delete configJson.name

        range.setValues([ [ name, jsonOrEncoded_(name, configJson), "", "", "" ] ])
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
           .getRange('c' + matchingRow) //(col 'c' saves temp objects)
        if (configJson) {
           if (tempName) {
              configJson.name = tempName //(insert name in case it's different)
           }
           range.setValue(jsonOrEncoded_(name, configJson))
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
      var savedObjRow = mgmtService.getRange('a' + i + ':' + 'd' + i)
      try {
        var savedObjName = savedObjRow.getCell(1, 1).getValue()
        var savedObjStr = savedObjRow.getCell(1, 2).getValue()
        var tempObjStr = savedObjRow.getCell(1, 3).getValue()
        var tempTrigger = savedObjRow.getCell(1, 4).getValue()
        if (!savedObjName && !savedObjStr) {
          continue //(if only one then log error since something weird has happened)
        }
        if ((defaultTableConfigKey_ == savedObjName) && ("{}" == savedObjStr)) { // unless overridden explicity, use the most up-to-date defaults
           var savedObj = defaultTableConfig_
         } else {
           var savedObj = parse_(savedObjStr)
        }
        if (tempObjStr) {
           savedObj.temp = parse_(tempObjStr)
        }
        if (tempTrigger) {
          savedObj.temp_trigger = tempTrigger
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

  /** Returns the JSON string (or its encoded version) */
  function jsonOrEncoded_(name, json) {
    var jsonStr = JSON.stringify(json, null, 3)
    if ((jsonStr.length >= 49500) || (name.indexOf("__encode_b64__") >= 0)) {
      return compressAndEncode_(jsonStr)
    } else {
      return jsonStr
    }
  }

  /** Returns a JSON object from a possible encoded/compressed string */
  function parse_(jsonStrOrBlob) {
    if ('{' == jsonStrOrBlob[0]) {
      return JSON.parse(jsonStrOrBlob)
    } else {
      return JSON.parse(decodeAndDecompress_(jsonStrOrBlob))
    }
  }

  /** Compresses and B64 encodes */
  function compressAndEncode_(jsonStr) {
    var textBlob = Utilities.newBlob(jsonStr)
    var gzipBlob = Utilities.gzip(textBlob)
    var encodedGzipStr = Utilities.base64Encode(gzipBlob.getBytes())
    return encodedGzipStr
  }

  /** Decodes and decompresses */
  function decodeAndDecompress_(encodedStr) {
    var decodedBlob = Utilities.newBlob(Utilities.base64Decode(encodedStr))
    decodedBlob.setContentType("application/x-gzip")
    var uncompressedBlob = Utilities.ungzip(decodedBlob)
    return uncompressedBlob.getDataAsString()
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
    getEsTriggerPolicy: getEsTriggerPolicy,
    setEsMeta: setEsMeta,

    addSavedObject: addSavedObject,
    updateSavedObject: updateSavedObject,
    setSavedObjectTrigger: setSavedObjectTrigger,
    updateTempSavedObject: updateTempSavedObject,
    deleteSavedObject: deleteSavedObject,
    listSavedObjects: listSavedObjects,

    getDefaultKeyName: function() { return defaultTableConfigKey_ },

    TESTONLY: {
      jsonOrEncoded_: jsonOrEncoded_,
      parse_: parse_
    }
  }

}())
