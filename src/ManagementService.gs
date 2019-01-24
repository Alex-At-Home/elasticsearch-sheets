/* 
 * ManagementService.gs - controls persistence of table configurations
 */

var managementSheetName_ = '__ES_ADDON_INTERNALS__'
var savedObjectMinRow_ = 7

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
  newSheet.getRange('a6').setValue('Saved objects:')  
  newSheet.autoResizeColumn(1)

  newSheet.getRange('d1').setValue('Enabled:')
  newSheet.getRange('d2').setValue('Query Trigger:')
  newSheet.autoResizeColumn(4)

  return newSheet;
}

/**
 * Retrieves the management sheet
 */
function getManagementService_() {
  var ss = SpreadsheetApp.getActive()
  return ss.getSheetByName(managementSheetName_)
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
      var savedObj = JSON.parse(savedObjStr)
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


