/*
 * Code.gs - The interface between the App and the Spreadsheet
 */

// 1] Interface with main UI

/**
 * A special function that inserts a custom menu when the spreadsheet opens.
 */
function onOpen() {
  var menu = [
    {name: 'Launch Elasticsearch Table Builder', functionName: 'launchElasticsearchTableBuilder_'},
    {name: 'Configure Elasticsearch...', functionName: 'launchElasticsearchConfig'}
  ]
//  var parentMenu = SpreadsheetApp.getUi().createAddonMenu()
//  parentMenu.addItem('Launch Elasticsearch Table Builder', 'launchElasticsearchTableBuilder_')
//  parentMenu.addItem(''Configure Elasticsearch...', 'launchElasticsearchConfig')
  SpreadsheetApp.getActive().addMenu('Elasticsearch', menu)

}

/** Allows expensive initialization/integrity checking operations to be performed only on page load */
var firstTime_ = true

/**
 * Creates any required internal state (first time) and launches the ES sidebar
 */
function launchElasticsearchTableBuilder_() {

  // If necessary, initialize the management service
  var mgmtService = getManagementService_()
  if (null == mgmtService) {
    launchElasticsearchConfig()
  }
  // We get to here when the modal gets stopped, so the management service should now be populated
  mgmtService = getManagementService_()
  if (null == mgmtService) {
     return
  }

  if (firstTime_) {
     checkTableRangesAgainstDataRanges_()
     firstTime_ = false
  }

  // Launch the sidebar
  var html = HtmlService.createTemplateFromFile('sidebarApp')
  html.defaultKey = defaultTableConfigKey_

  if (testMode_) {
     triggerUiEvent_("sidebarApp", { default_key: html.defaultKey })
  } else {
     SpreadsheetApp.getUi().showSidebar(html.evaluate().setTitle('Elasticsearch Table Builder'))
  }
}

/** Launches the ES configuration dialog */
function launchElasticsearchConfig() {
  var mgmtService = getManagementService_()
  var html = HtmlService.createTemplateFromFile('elasticsearchConfigDialog')
  if (null == mgmtService) {
     html.currentUrl = ""
     html.currentUsername = ""
     html.currentAuthType = "anonymous"
  } else {
     var es_meta = getEsMeta_(mgmtService)
     html.currentUrl = es_meta.url
     html.currentUsername = es_meta.username
     if (es_meta.auth_type == "password") {
        if (es_meta.password_global) {
           html.currentAuthType = "password_global"
        } else {
           html.currentAuthType = "password_local"
        }
     } else {
        html.currentAuthType = es_meta.auth_type
     }
  }
  if (testMode_) {
     triggerUiEvent_("elasticsearchConfigDialog", {
        current_url: html.currentUrl, current_username: html.currentUsername, current_auth_type: html.currentAuthType
     })
  } else {
     SpreadsheetApp.getUi().showModalDialog(html.evaluate().setWidth(450).setHeight(350), 'Elasticsearch Configuration')
  }
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

/** The key name used internally by both service and client to store the default table object described below */
var defaultTableConfigKey_ = "d_e_f_a_u_l_t"

/** The default table config - also using to sort-of-document the model */
var defaultTableConfig_ = {
  "enabled": true,
  "common": {
//     "refresh": {
//        "on_query_change": true,
//        "timed": false,
//        "refresh_s": 60
//     },
     "query": {
//       "index_pattern": "tbd",
       "source": "none",
        //, //points to field to use ("global", "local", "fixed") .. NOT_SUPPORTED: "global", "fixed"
//        "global": {
//           "range_name": "tbd"
//        },
        "local": {
           "position": "top" //(or "bottom" ... NOT_SUPPORTED: "bottom")
        }
        //,
//        "fixed": {
//           "string": "{} or SQL or lucene"
//        }
     },
     "pagination": {
        "source": "none",
        //, //points to field to use ("global", "local", "fixed") .. NOT_SUPPORTED: "global", "fixed"
//       "global": {
//          "enabled": false,
//          "range_name": "tbd"
//       },
       "local": {
          "position": "bottom" //(or "top") .. NOT_SUPPORTED: "top"
       }
     },
     "status": {
        "position": "top", //(or "bottom", "none")
        "merge": true //(if false will be its own separate line, else will merge with query/pagination if they exist)
     },
     "headers": {
        "position": "top" //(or "bottom", "top_bottom", "none") .. NOT_SUPPORTED: "bottom", "top_bottom"
//        "header_overrides": "", //TODO format?
//        "filter_headers": false //(if true then only select headers specified in the overrides)
     },
     "formatting": {
        "theme": "minimal" //(or "none", in the future: "default", etc)
     },
     "skip": {
        "rows": "", //comma-separated list of offsets
        "cols": "", //comma-separated list of offsets
     }
     //,
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
    "query": "--SHOW TABLES\n" +
              "--DESCRIBE <<index>>\n" +
              "--SELECT * FROM <<index>> WHERE $$query $$pagination"
  },
  "cat_table": {
    "enabled": false,
    "endpoint": "",
    "options": [ ] // (prefix with '#' to ignore)
  }
}

// 2] Interface with sidebar

// 2.1] General status/error info

/** Provides status/error messaging back to user via a toast pop-up */
function showStatus(message, title) {
   if (testMode_) {
      triggerUiEvent_("toast", { message: message, title: title })
   } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(message, title)
   }
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
