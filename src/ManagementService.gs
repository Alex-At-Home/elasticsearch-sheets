/*
 * ManagementService.gs - controls persistence of table configurations
 */

/** Using a sheet to store all the meta - the sheet name */
var managementSheetName_ = '__ES_ADDON_INTERNALS__'
/** (where the saved objects aka data tables start */
var savedObjectMinRow_ = 9

/** Just an illustration of the ES metadata model returned by the management service */
var esMetaModel_ = {
   "url": "string",
   "version": "string", //(optional)
   "username": "string",
   "password": "string", //(will not normally be populated)
   "auth_type": "string", //"anonymous", "password", in the future: "token", "saml", "oauth" etc
   "password_global": false, // false if stored locally (ie only accessible for given user)
   "header_json": {}, //key, value map
   "client_options_json": {}, //(passed directly to ES client)
   "enabled": true,
   "query_trigger": "string", //"none", "timed", "popup", "timed_or_popup"
   "query_trigger_interval_s": 2
}

/**
 * The first time ES add-on is launched for a given spreadsheet, builds the management sheet
 */
function createManagementService_(sourceConfig) {
  var ss = SpreadsheetApp.getActive()
  var currActive = ss.getActiveSheet()
  var currNumSheets = ss.getNumSheets()
  var newSheet = ss.insertSheet(managementSheetName_, currNumSheets)
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

  return newSheet;
}

/**
 * Retrieves the management sheet
 */
function getManagementService_() {
  var ss = SpreadsheetApp.getActive()
  return ss.getSheetByName(managementSheetName_)
}

/** Retrieves and formats the ES metadata */
function getEsMeta_(mgmtService) {
   var obj = {}
   obj.url = mgmtService.getRange('b1').getValue()
   obj.version = mgmtService.getRange('b2').getValue()
   obj.username = mgmtService.getRange('b3').getValue()
   obj.password = mgmtService.getRange('b4').getValue()
   obj.password_global = (obj.password && (obj.password != ""))
   obj.auth_type = mgmtService.getRange('b5').getValue()
   try {
      obj.header_json = JSON.parse(mgmtService.getRange('b6').getValue())
   } catch (err) {
      delete obj.header_json
   }
   try {
      obj.client_options_json = JSON.parse(mgmtService.getRange('b7').getValue())
   } catch (err) {
      delete obj.client_options_json
   }
   obj.enabled = mgmtService.getRange('f1').getValue().toLowerCase() != "false"
   obj.query_trigger = mgmtService.getRange('b1').getValue()
   var interval = parseInt(mgmtService.getRange('b1').getValue() || "")
   if (!interval || (interval <= 0) || (interval == NaN)) {
     interval = 2
   }
   obj.query_trigger_interval_s = interval
   return obj
}

/** Creates a saved object in the management service */
function addSavedObject_(mgmtService, name, configJson) {
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
function updateSavedObject_(mgmtService, name, configJson) {
  var matchingRow = savedObjectMinRow_ - 1
  var found = false
  while (!found) {
    matchingRow++
    found = (name == mgmtService.getRange('a' + matchingRow).getValue())
  }
  if (found) {
      var curr = mgmtService.getRange('b' + matchingRow)
      var range = mgmtService
         .getRange('a' + matchingRow + ':' + 'c' + matchingRow) //(col 'c' will be to store temp objects in the future)
      range.setValues([ [ name, JSON.stringify(configJson, null, 3), "" ] ])
     return true
  } else {
     return false
  }
}

/** Deletes the entire row containing the saved object with the given name */
function deleteSavedObject_(mgmtService, name) {
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
function listSavedObjects_(mgmtService, discardRange) {

  var firstRow = savedObjectMinRow_
  var lastRow = mgmtService.getLastRow()

  var savedObjList = {}
  for (var i = firstRow; i <= lastRow; ++i) {
    var savedObjRow = mgmtService.getRange('a' + i + ':' + 'c' + i)
    try {
      var savedObjName = savedObjRow.getCell(1, 1).getValue()
      var savedObjStr = savedObjRow.getCell(1, 2).getValue()
      if ((savedObjName == defaultTableConfigKey_) && ("{}" == savedObjStr)) { // unless overridden explicity, use the most up-to-date defaults
         var savedObj = defaultTableConfig_
      } else {
         var savedObj = JSON.parse(savedObjStr)
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
