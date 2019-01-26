/*
 * Code.gs - The interface between the App and the Spreadsheet
 */

// 1] Interface with main UI

/**
 * A special function that inserts a custom menu when the spreadsheet opens.
 */
function onOpen() {
  var menu = [
    {name: 'Launch Elasticsearch Table Builder', functionName: 'launchElasticsearch_'}
  ]
//  var parentMenu = SpreadsheetApp.getUi().createAddonMenu()
//  parentMenu.addItem('Launch Elasticsearch Table Builder', 'launchElasticsearch_')
  SpreadsheetApp.getActive().addMenu('Elasticsearch', menu)

}

/** Allows expensive initialization/integrity checking operations to be performed only on page load */
var firstTime = true

/**
 * Creates any required internal state (first time) and launches the ES sidebar
 */
function launchElasticsearch_() {

  // If necessary, initialize the management service
  var mgmtService = getManagementService_()
  if (null == mgmtService) {
     //TODO: the first time, bring up source dialog (form) to populate ES info
    createManagementService_({})
  }

  if (firstTime) {
     checkTableRangesAgainstDataRanges_()
     firstTime = false
  }

  // Launch the sidebar
  var html = HtmlService.createTemplateFromFile('sidebarApp')
  html.defaultKey = defaultTableConfigKey_

  SpreadsheetApp.getUi().showSidebar(html.evaluate().setTitle('Elasticsearch Table Builder'))
}

/** Check that the entries in the management service have named ranges (and vice versa) */
function checkTableRangesAgainstDataRanges_() {
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

var defaultTableConfigKey_ = "d_e_f_a_u_l_t"
var defaultTableConfig_ = {
  "enabled": true,
  "common": {
//     "refresh": {
//        "on_query_change": true,
//        "timed": false,
//        "refresh_s": 60
//     },
     "index_pattern": "tbd",
     "query": {
        "type": "none", //points to field to use ("global", "local", "fixed")
        "global": {
           "range_name": "tbd"
        },
        "local": {
//           "position": "top" //(or "bottom")
        },
        "fixed": {
           "string": "{} or SQL or lucene"
        }
     },
     "pagination": {
       "global": {
          "enabled": false,
          "range_name": "tbd"
       },
       "local": {
          "enabled": false,
//          "position": "top", //(or "bottom")
          "simulate_where_not_supported": true
       }
     },
     "status": {
        "enabled": true,
        "position": "top", //(or "bottom")
        "merge_if_possible": true //(merge with the query/pagination)
     },
     "headers": {
        "enabled": true,
//        "position": "top", //(or "bottom", or "top_and_bottom")
        "header_overrides": "", //TODO format?
        "filter_headers": false //(if true then only select headers specified in the overrides)
     },
     "borders": {
        "enabled": true
     }
//     ,
//     "rotated": false, //(left-to-right instead of top-to-bottom)
//     "inverted": false //(right-to-left/bottom-to-top)
  },
  "data_table": {
    "enabled": false,
  },
  "aggregation_table": {
    "enabled": false,
  },
  "sql_table": {
    "enabled": false,
    "query": "SELECT $$headers from $$index WHERE $$query $$pagination" //TODO: not sure about this? how does pagination work exactly? oh and what about field list
  },
  "cat_table": {
    "enabled": false,
    "endpoint": "recovery",
    "options": [ ] // (prefix with '#' to ignore)
  }
}

// 2] Interface with sidebar

// 2.1] General status/error info

/** Provides status/error messaging back to user via a toast pop-up */
function showStatus(message, title) {
   SpreadsheetApp.getActiveSpreadsheet().toast(message, title)
}

/** The UI requests that it be reloaded following a change to data that it can't/doesn't want to try to reconcile client-side */
function reloadPage() {
  launchElasticsearch_()
}

// 2.2] Table range management

/** Switch to the active range */
function showTableRangeManager(tableName) {
  if (activateTableRange(tableName)) {
     var html = HtmlService.createTemplateFromFile('moveRangeDialog')
     html.tableName = tableName
     SpreadsheetApp.getUi().showModelessDialog(html.evaluate().setHeight(100), 'Move Table: ' + tableName);
  }
}

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

// 2.3] Table management

/** Lists the current data tables (including the default one used to populate the "create new table" entry */
function listTableConfigs() {
  var mgmtService = getManagementService_()

  var tableConfigs = listSavedObjects_(mgmtService, /*discardRange=*/true)
  if (!tableConfigs.hasOwnProperty(defaultTableConfigKey_)) {
    addSavedObject_(mgmtService, defaultTableConfigKey_, {})
    return listSavedObjects_(mgmtService, /*discardRange=*/true)
  } else {
    return tableConfigs
  }
}

/** Adds a new table to the management service */
function createTable(name, tableConfigJson) {
   return createTable_(name, tableConfigJson, /*ignoreNamedRange=*/false)
}

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
    return addSavedObject_(mgmtService, name, tableConfigJson)
  } else {
    return false
  }
}

/** Deletes a table from the management service */
function deleteTable(name) {
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
