/*
 * TableService.gs - manages higher level table constructors (ManagementService is lower level)
 */
var TableService_ = (function(){

  ////////////////////////////////////////////////////////

  // 1] Table Range Management

  /** Returns the current table range */
  function getCurrentTableRange(tableName) {
    var ss = SpreadsheetApp.getActive()
    var tableRange = TableRangeUtils_.findTableRange(ss, tableName)
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
    var tableRange = TableRangeUtils_.findTableRange(ss, tableName)
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
    var retVal = TableRangeUtils_.moveTableRange(ss, tableName, newRange)
    if (retVal) {
      ManagementService_.setSavedObjectTrigger(tableName, "config_change")
      ElasticsearchService_.markTableAsPending(tableName) //(fire and forget)
    }
    return retVal
  }

  /** Gets the current selection */
  function getCurrentSelection() {
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
    var tableConfigs = ManagementService_.listSavedObjects(/*discardRange=*/true)
    if (!tableConfigs.hasOwnProperty(ManagementService_.getDefaultKeyName())) {
      ManagementService_.addSavedObject(ManagementService_.getDefaultKeyName(), {})
      return listTableConfigs()
    } else {
      Object.keys(tableConfigs).forEach(function(key) {
        delete tableConfigs[key].temp_trigger //(don't expose these)
      })
      return tableConfigs
    }
  }

  /** List the triggered tables in the format { table_name: trigger } */
  function listTriggeredTables() {
    var tableConfigs = ManagementService_.listSavedObjects(/*discardRange=*/true)
    var retVal = {}
    Object.keys(tableConfigs).forEach(function(name) {
      var el = tableConfigs[name]
      //(never allowed to trigger on the default object, add this for safety)
      if ((ManagementService_.getDefaultKeyName() != name) && el.temp_trigger) {
        retVal[name] = el.temp_trigger
      }
    })
    return retVal
  }

  /** Stores the temp config */
  function stashTempConfig(tableName, currName, tempConfig) {
     ManagementService_.updateTempSavedObject(tableName, currName, tempConfig)
  }

  /** Clears the temp config */
  function clearTempConfig(tableName) {
     ManagementService_.updateTempSavedObject(tableName, null, null)
  }

  /** Adds a new table to the management service */
  function createTable(name, tableConfigJson) {
     return createTable_(name, tableConfigJson, /*ignoreNamedRange=*/false)
  }

  /** Deletes a table from the management service */
  function deleteTable(name) { //TODO: this also deletes all the existing data
    // Named range:
    var ss = SpreadsheetApp.getActive()
    TableRangeUtils_.deleteTableRange(ss, name)

    // Update mangement service
    return ManagementService_.deleteSavedObject(name)
  }

  /** Updates a table in the management service - can't update the range, that will be a separate endpoint */
  function updateTable(oldName, newName, newTableConfigJson) {
    var ss = SpreadsheetApp.getActive()

    // Marge in existing sheet/range (if it exists)
    var tableConfigs = ManagementService_.listSavedObjects(/*discardRange=*/false)
    var existingJson = tableConfigs[oldName] || {}
    newTableConfigJson.sheet = existingJson.sheet
    newTableConfigJson.range = existingJson.range

    if (oldName != newName) { // can use existing primitives
       if (createTable_(newName, newTableConfigJson, /*ignoreNamedRange=*/true)) {
          // Rename named range (can't fail except in catastrophic cases):
          TableRangeUtils_.renameTableRange(ss, oldName, newName)

          // Delete saved old object in management service
          // (if this fails, it most likely didn't exist due to some inconsistent internal state)
          ManagementService_.deleteSavedObject(oldName)
          return true
       } else {
          return false // failed to insert new
       }
    } else {
       // Update in management service
       return ManagementService_.updateSavedObject(oldName, newTableConfigJson)
    }
  }

  // 3] Misc

  /** Check that the entries in the management service have named ranges (and vice versa) */
  function checkTableRangesAgainstDataRanges() {
     var ss = SpreadsheetApp.getActive()
     var tableMap = ManagementService_.listSavedObjects(/*discardRange=*/false)
     for (var tableName in tableMap) {
        var tableRange = TableRangeUtils_.findTableRange(ss, tableName) //TODO: need a batch version of this to avoid N^2
        var configJson = tableMap[tableName]
        if ((null == tableRange) && configJson.sheet && configJson.range) { // Somehow lost the named data range, but have it stored so rebuild
           TableRangeUtils_.rebuildTableRange(ss, tableName, configJson)
        } else if (null != tableRange) { // if table range exists, we treat it as authoritative
           var sheet = tableRange.getRange().getSheet().getName()
           var range = tableRange.getRange().getA1Notation()
           if ((sheet != configJson.sheet) || (range != configJson.range)) {
              configJson.sheet = sheet
              configJson.range = range
              ManagementService_.updateSavedObject(tableName, configJson)
           }
        }
     }
  }

  /** Returns a map of tables intersecting the given range
  * if addRange is set to true then inject the range as activeRange
  */
  function findTablesIntersectingRange(range, addRange) {
    var ss = SpreadsheetApp.getActive()
    var tableMap = ManagementService_.listSavedObjects()
    var namedRangeMap = TableRangeUtils_.listTableRanges(ss, Object.keys(tableMap))
    var retVal = {}
    Object.keys(namedRangeMap).forEach(function(tableName) {
      var tableConfig = tableMap[tableName]
      var namedRange = namedRangeMap[tableName]
      var globalTriggerRanges = TableRangeUtils_.getExternalTableRanges(
        namedRange.getRange().getSheet(), tableConfig, /*controlOnly*/false
      )
      var allRangesToTest = globalTriggerRanges.concat([ namedRange.getRange() ])
      for (rangeToTestIndex in allRangesToTest) {
        var rangeToTest = allRangesToTest[rangeToTestIndex]
        if (TableRangeUtils_.doRangesIntersect(range, rangeToTest)) {
          retVal[tableName] = TableRangeUtils_.shallowCopy(tableConfig)
          if (addRange) {
            retVal[tableName].activeRange = namedRange.getRange()
          }
          break //(no more checks needed, match gets qualified in calling method)
        }
      }
    })
    return retVal
  }

  ////////////////////////////////////////////////////////

  // Internals

  /** Adds a new table to the management service (internal implementation) */
  function createTable_(name, tableConfigJson, ignoreNamedRange) {
    var ss = SpreadsheetApp.getActive()

    var matchesExistingRange = TableRangeUtils_.findTableRange(ss, name)
    if (null != matchesExistingRange) {
       showStatus("All names have to be unique when converted to named ranges, conflict with: [" + matchesExistingRange.getName() + "]", 'Server Error')
       return false
    }

    var rangeValid = true
    if (!ignoreNamedRange) {
       //(buildTableRange mutates tableConfigJson adding range and sheet)
       rangeValid = TableRangeUtils_.buildTableRange(ss, name, tableConfigJson)
    }
    if (rangeValid) {
      var retVal = ManagementService_.addSavedObject(name, tableConfigJson)
      ElasticsearchService_.markTableAsPending(name) //(fire and forget)
      if (retVal) { // clear temp
         ManagementService_.updateTempSavedObject(ManagementService_.getDefaultKeyName(), null, null)
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
    getCurrentSelection: getCurrentSelection,

    listTableConfigs: listTableConfigs,
    listTriggeredTables: listTriggeredTables,
    stashTempConfig: stashTempConfig,
    clearTempConfig: clearTempConfig,
    createTable: createTable,
    deleteTable: deleteTable,
    updateTable: updateTable,

    checkTableRangesAgainstDataRanges: checkTableRangesAgainstDataRanges,
    findTablesIntersectingRange: findTablesIntersectingRange,

    TESTONLY: {
    }
  }

}())
