/*
 * TableService.gs - manages higher level table constructors (ManagementService is lower level)
 */
var TableService_ = (function(){

  ////////////////////////////////////////////////////////

  // 1] Table Range Management

  /** Returns the current table range */
  function getCurrentTableRange(tableName) {
    var ss = SpreadsheetApp.getActive()
    var tableRange = findTableRange_(ss, tableName)
    var obj = {}
    if (null != tableRange) {
       obj.sheet = tableRange.getRange().getSheet().getName()
       obj.range = tableRange.getRange().getA1Notation()
    }
    return obj
  }

  /** Activates the current table range (bug in sheets code, messes up keybaord focus so use with care */
  function activateTableRange(tableName) {
    var ss = SpreadsheetApp.getActive()
    var tableRange = findTableRange_(ss, tableName)
    if (null != tableRange) {
       tableRange.getRange().activate() //(problem .. this leaves the focus in the sidebar but typing goes into the spreadsheet)
       return true
    } else {
       return false
    }
  }


  /** Moves the range for the specified table */
  function setCurrentTableRange(tableName, newRange) {
    var ss = SpreadsheetApp.getActive()
    return moveTableRange_(ss, tableName, newRange)
  }

  /** Gets the current selection */
  function getCurrentTableRangeSelection() {
    var ss = SpreadsheetApp.getActive()
    var range = ss.getActiveRange()
    if (null != range) {
      var obj = {}
      obj.range = range.getA1Notation()
      obj.sheet = range.getSheet().getName()
      return obj
    } else {
       return null
    }
  }

  // 2] Table Management

  /** Lists the current data tables (including the default one used to populate the "create new table" entry */
  function listTableConfigs() {
    var mgmtService = getManagementService_()

    var tableConfigs = listSavedObjects_(mgmtService, /*discardRange=*/true)
    if (!tableConfigs.hasOwnProperty(ManagementService_.getDefaultKeyName())) {
      addSavedObject_(mgmtService, ManagementService_.getDefaultKeyName(), {})
      return listSavedObjects_(mgmtService, /*discardRange=*/true)
    } else {
      return tableConfigs
    }
  }

  /** Stores the temp config */
  function stashTempConfig(tableName, currName, tempConfig) {
     var mgmtService = getManagementService_()
     updateTempSavedObject_(mgmtService, tableName, currName, tempConfig)
  }

  /** Clears the temp config */
  function clearTempConfig(tableName) {
     var mgmtService = getManagementService_()
     updateTempSavedObject_(mgmtService, tableName, null, null)
  }

  /** Adds a new table to the management service */
  function createTable(name, tableConfigJson) {
     return createTable_(name, tableConfigJson, /*ignoreNamedRange=*/false)
  }

  /** Deletes a table from the management service */
  function deleteTable(name) { //TODO: this also deletes all the existing data
    // Named range:
    var ss = SpreadsheetApp.getActive()
    deleteTableRange_(ss, name)

    // Update mangement service
    var mgmtService = getManagementService_()
    return deleteSavedObject_(mgmtService, name)
  }

  /** Updates a table in the management service - can't update the range, that will be a separate endpoint */
  function updateTable(oldName, newName, newTableConfigJson) {
    var ss = SpreadsheetApp.getActive()
    var mgmtService = getManagementService_()

    // Marge in existing sheet/range (if it exists)
    var tableConfigs = listSavedObjects_(mgmtService, /*discardRange=*/false)
    var existingJson = tableConfigs[oldName] || {}
    newTableConfigJson.sheet = existingJson.sheet
    newTableConfigJson.range = existingJson.range

    if (oldName != newName) { // can use existing primitives
       if (createTable_(newName, newTableConfigJson, /*ignoreNamedRange=*/true)) {
          // Rename named range (can't fail except in catastrophic cases):
          renameTableRange_(ss, oldName, newName)

          // Delete saved old object in management service
          // (if this fails, it most likely didn't exist due to some inconsistent internal state)
          deleteSavedObject_(mgmtService, oldName)
          return true
       } else {
          return false // failed to insert new
       }
    } else {
       // Update in management service
       return updateSavedObject_(mgmtService, oldName, newTableConfigJson)
    }
  }

  // 3] Misc

  /** Check that the entries in the management service have named ranges (and vice versa) */
  function checkTableRangesAgainstDataRanges() {
     var ss = SpreadsheetApp.getActive()
     var mgmtService = getManagementService_()
     var tableMap = listSavedObjects_(mgmtService, /*discardRange=*/false)
     for (var tableName in tableMap) {
        var tableRange = findTableRange_(ss, tableName) //TODO: need a batch version of this to avoid N^2
        var configJson = tableMap[tableName]
        if ((null == tableRange) && configJson.sheet && configJson.range) { // Somehow lost the named data range, but have it stored so rebuild
           rebuildTableRange_(ss, tableName, configJson)
        } else if (null != tableRange) { // if table range exists, we treat it as authoritative
           var sheet = tableRange.getRange().getSheet().getName()
           var range = tableRange.getRange().getA1Notation()
           if ((sheet != configJson.sheet) || (range != configJson.range)) {
              configJson.sheet = sheet
              configJson.range = range
              updateSavedObject_(mgmtService, tableName, configJson)
           }
        }
     }
  }

  ////////////////////////////////////////////////////////

  // Internals

  /** Adds a new table to the management service (internal implementation) */
  function createTable_(name, tableConfigJson, ignoreNamedRange) {
    var mgmtService = getManagementService_()
    var ss = SpreadsheetApp.getActive()

    var matchesExistingRange = findTableRange_(ss, name)
    if (null != matchesExistingRange) {
       showStatus("All names have to be unique when converted to named ranges, conflict with: [" + matchesExistingRange.getName() + "]", 'Server Error')
       return false
    }

    var rangeValid = true
    if (!ignoreNamedRange) {
       //(buildTableRange mutates tableConfigJson adding range and sheet)
       rangeValid = buildTableRange_(ss, name, tableConfigJson)
    }
    if (rangeValid) {
      var retVal = addSavedObject_(mgmtService, name, tableConfigJson)
      if (retVal) { // clear temp
         updateTempSavedObject_(mgmtService, ManagementService_.getDefaultKeyName(), null, null)
      }
      return retVal
    } else {
      return false
    }
  }

  ////////////////////////////////////////////////////////

  return {
    getCurrentTableRange: getCurrentTableRange,
    activateTableRange: activateTableRange,
    setCurrentTableRange: setCurrentTableRange,
    getCurrentTableRangeSelection: getCurrentTableRangeSelection,

    listTableConfigs: listTableConfigs,
    stashTempConfig: stashTempConfig,
    clearTempConfig: clearTempConfig,
    createTable: createTable,
    deleteTable: deleteTable,
    updateTable: updateTable,

    checkTableRangesAgainstDataRanges: checkTableRangesAgainstDataRanges,

    TESTONLY: {
    }
  }

}())
