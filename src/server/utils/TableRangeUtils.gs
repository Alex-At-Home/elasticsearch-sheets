/*
 * TableRangeUtils.gs - manages named data ranges corresponding to data tables
 */
 var TableRangeUtils_ = (function(){

   ////////////////////////////////////////////////////////

   // 1] Higher level utils

   /** Validates that the range specified by the JSON is valid */
   function validateNewRange(ss, configJson) {
      var newRangeNotation = configJson.range
      var newSheetName = configJson.sheet
      if (!newSheetName && !newRangeNotation) {
         // No new range specified, all is good
         return true
      }
      if (!newSheetName || !newRangeNotation) {
         // If specifying one, have to specify the other
         UiService_.showStatus("If manually specifying range, need to specify both 'range' and 'sheet'", "Server Error")
         return false
      }
      // Both are specified, let's check they are valid
      var newSheet = ss.getSheetByName(newSheetName)
      if (ManagementService_.managementSheetName() == newSheetName) {
         UiService_.showStatus("Cannot build data table on management sheet", "Server Error")
         return false
      } else if (null == newSheet) {
         UiService_.showStatus("No sheet named: [" + newSheetName + "]", "Server Error")
         return false
      } else if (null == newSheet.getRange(newRangeNotation)) {
         UiService_.showStatus("Invalid range notation, should be eg 'A1:F10': [" + newRangeNotation + "]", "Server Error")
         return false
      } else {

         // Format skip rows/cols (error if wrong)
         //TODO

         // Check range vs width
         var specialRowInfo = buildSpecialRowInfo(configJson)
         var minWidth = specialRowInfo.min_width
         var minHeight = specialRowInfo.min_height
         //TODO: skip should also add to width/height
         var newRange = newSheet.getRange(newRangeNotation)
         if ((newRange.getHeight() < minHeight) || (newRange.getWidth() < minWidth)) {
            UiService_.showStatus("Need at least a "+minHeight+"x"+minWidth+" grid to build this table: [" + newRangeNotation + "] is too small", "Server Error")
            return false
         }
         var totalCells = newRange.getHeight()*newRange.getWidth()
         if (totalCells > 50000) {  //(10% of total cell country for performance)
           UiService_.showStatus("Max [50000] cells, this table: [" + newRangeNotation + "] is too large [" + totalCells + "]", "Server Error")
           return false
         }
      }
      return true
   }

   /** Builds a named range for the data table */
   function buildTableRange(ss, tableName, mutableConfigJson) {

     // Fill in $.range and $.sheet
     if (mutableConfigJson.range || mutableConfigJson.sheet) {
        UiService_.showStatus("Cannot specify range or sheet when creating a table - build a range in the desired sheet first", "Server Error")
        return false
     }
     var currActive = ss.getActiveSheet()
     var range = currActive.getActiveRange()
     var rangeNotation = range.getA1Notation()
     var sheetName = range.getSheet().getName()

     mutableConfigJson.range = rangeNotation
     mutableConfigJson.sheet = sheetName

     // Convert "select-all" ranges
     range = TableRangeUtils_.fixSelectAllRanges(mutableConfigJson, range)

     // Validate and build range if possible
     if (!validateNewRange(ss, mutableConfigJson)) {
        return false
     } else {
        ss.setNamedRange(buildTableRangeName_(tableName), range)
        return true
     }
   }

   /** Builds a table range from JSON */
   function rebuildTableRange(ss, tableName, configJson) {
      var newRange = ss.getSheetByName(configJson.sheet).getRange(configJson.range)
      ss.setNamedRange(buildTableRangeName_(tableName), newRange)
   }

   /** Deletes the named range corresponding to the data table (ie as part of deleting the data table)
   */
   function deleteTableRange(ss, tableName, range) {
      var matchingRange = range || findTableRange(ss, tableName)
      if (range) {
        tableName = range.getName()
      } else {
         tableName = buildTableRangeName_(tableName)
      }
      if (null != matchingRange) {
         matchingRange.getRange().clearNote()
         matchingRange.getRange().clear()
         ss.removeNamedRange(tableName)
      }
   }

   /** Deletes all table ranges */
   function clearTableRanges(ss) {
      var tableRanges = listTableRanges(ss)
      for (var k in tableRanges) {
         deleteTableRange(ss, null, tableRanges[k])
      }
   }

   /** Returns a table range, or null if one doesn't exist */
   function findTableRange(ss, tableName) {
      var nameToFind = buildTableRangeName_(tableName)
      var ranges = ss.getNamedRanges()
      for (var i in ranges) {
         var range = ranges[i]
         if (nameToFind == range.getName()) {
            return range
         }
      }
      return null
   }

   /** Renames a named range */
   function renameTableRange(ss, oldName, newName) {
      var matchingRange = findTableRange(ss, oldName)
      if (null != matchingRange) {
         matchingRange.setName(buildTableRangeName_(newName))
      }
   }
   //TODO: what to do with user fields in here? need some defensive logic

   /** Move a named range (new range is pre-validated) */
   function moveTableRange(ss, tableName, configJson) {
      if (!validateNewRange(ss, configJson)) {
         return false
      }
      var newRangeNotation = configJson.range
      var newSheetName = configJson.sheet
      if (newRangeNotation && newSheetName) { //(null means "leave alone")
        // If we get to here then the range has already been validated
        var currMatchingRange = findTableRange(ss, tableName)
        if (null != currMatchingRange) {
           // Build a new range
           var currSheetWithRange = currMatchingRange.getRange().getSheet()
           if ((currSheetWithRange.getName() != newSheetName) ||
                  (currMatchingRange.getRange().getA1Notation().toLowerCase() != newRangeNotation.toLowerCase()))
           {
             var newRange = ss.getSheetByName(newSheetName).getRange(newRangeNotation)
             // Move data and format to new range
             var resizedOldRange =
              resizeToTargetRange_(currMatchingRange.getRange(), newRange)
             resizedOldRange.moveTo(newRange)
             currMatchingRange.setRange(newRange)
           }
        }
     }
     return true
   }

   /** Builds the location of the query/status/header/pagination rows */
   function buildSpecialRowInfo(configJson) {
     var headers = getJson(configJson, [ "common", "headers" ]) || {}
     var status = getJson(configJson, [ "common", "status" ]) || {}
     var queryBar = getJson(configJson, [ "common", "query" ]) || {}
     var localQueryBar = (queryBar.source == "local") ? (queryBar.local || {}) : {}
     var pagination = getJson(configJson, [ "common", "pagination" ] ) || {}
     var localPaginationBar = (pagination.source == "local") ? (pagination.local || {}) : {}

     var specialRows = {
        query_bar: 0,
        pagination: 0,
        status: 0,
        headers: 0
        //is_merged - filled in later
        //min_height - filled in later
        //min_width - filled in later
        //skip_rows - filled in later
        //skip_cols - filled in later
     }
     var currFromTop = 0
     var currFromBottom = 0

     switch(localQueryBar.position || "none") {
       case "top":
          specialRows.query_bar = ++currFromTop
          break
       case "bottom":
          specialRows.query_bar = --currFromBottom
          break
     }
     switch(localPaginationBar.position || "none") {
       case "top":
          specialRows.pagination = ++currFromTop
          break
       case "bottom":
          specialRows.pagination = --currFromBottom
          break
     }
     switch(status.position || "none") {
       case "top":
          if (!(status.merge || false) || (currFromTop == 0)) {
             ++currFromTop
          }
          specialRows.status = currFromTop
          break
       case "bottom":
          if (!(status.merge || false) || (currFromBottom == 0)) {
             --currFromBottom
          }
          specialRows.status = currFromBottom
          break
     }
     switch(headers.position || "none") {
       case "top":
          specialRows.headers = ++currFromTop
          break
       case "bottom":
          specialRows.headers = --currFromBottom
          break
     }

     // Skip rows and cols:

     //TODO
     specialRows.skip_rows = []
     specialRows.skip_cols = []

     // Some more processing:

     var minWidth = 1
     var minHeight = 1
     for (var k in specialRows) {
        if (specialRows[k] != 0) {
           minHeight++
           if (k != "headers") {
              minWidth = 2
           }
        }
     }
     specialRows.is_merged = (specialRows.status != 0) &&
         ((specialRows.status == specialRows.pagination) || (specialRows.status == specialRows.query_bar))

     if (specialRows.is_merged) {
        minHeight--
        minWidth = 4
     }
     specialRows.min_height = minHeight
     specialRows.min_width = minWidth

     return specialRows
   }

   ////////////////////////////////////////////////////////

   // 2] Lower level utils

   /** Safe way of getting a json element safely */
   function getJson(json, fieldArray) {
     var tmpJson = json
     for (var j in fieldArray) {
       var key = fieldArray[j]
       if (tmpJson.hasOwnProperty(key)) {
         tmpJson = tmpJson[key]
       } else {
         return null
       }
     }
     return tmpJson
   }

   /** Gets a nested JSON element object, creates it if it doesn't exist */
   function getOrPutJsonObj(json, fieldArray) {
     var tmpJson = json
     for (var j in fieldArray) {
       var key = fieldArray[j]
       if (tmpJson.hasOwnProperty(key)) {
         tmpJson = tmpJson[key]
       } else {
         var tmp = {}
         tmpJson[key] = tmp
         tmpJson = tmp
       }
     }
     return tmpJson
   }

   /** Quick shallow copy of JSON */
   function shallowCopy(json) {
     var retVal = {}
     for (var k in json) {
       retVal[k] = json[k]
     }
     return retVal
   }

   /** Format date to a standard */
   function formatDate(date) {
     var dateOrNow = date ? date : new Date()
     var ss = SpreadsheetApp.getActiveSpreadsheet()
     return Utilities.formatDate(dateOrNow, ss.getSpreadsheetTimeZone(),
      "HH:mm@MM.dd.yy"
    )
   }

   /** Fix notations like A:A, 1:10, etc */
   function fixSelectAllRanges(tableConfig, inRange) {
     var range = inRange
     if (!range.getA1Notation() && (range.getNumRows() > 0)) {
       tableConfig.range = "A1:Z50"
       range = range.getSheet().getRange("A1:Z50")
     } else if (range.getA1Notation().match(/[0-9]+:[0-9]+/)) {
       range = range.getSheet().getRange(1, 1, range.getNumRows(), 26)
       tableConfig.range = range.getA1Notation()
     } else if (range.getA1Notation().match(/[a-z]+:[a-z]+/i)) {
       range = range.getSheet().getRange(1, 1, 50, range.getNumColumns())
       tableConfig.range = range.getA1Notation()
     }
     return range
   }

   /** Returns true if 2 ranges have a non-empty intersection */
   function doRangesIntersect(r1, r2) {
     return (r1.getLastRow() >= r2.getRow()) && (r2.getLastRow() >= r1.getRow()) &&
     (r1.getLastColumn() >= r2.getColumn()) && (r2.getLastColumn() >= r1.getColumn()) &&
     (r1.getSheet().getName() == r2.getSheet().getName())
   }

   /** Returns a map of table ranges with name as key
    * tableNames is a list of actual names and is used
    * to translate the names from listTableRanges
    */
   function listTableRanges(ss, tableNames) {
      var sheetPrefix = ManagementService_.managementSheetName()
      var retVal = {}
      var tableNameMap = {}
      if (tableNames) tableNames.forEach(function(name) {
        tableNameMap[buildTableRangeName_(name)] = name
      })
      var ranges = ss.getNamedRanges()
      for (var i in ranges) {
         var range = ranges[i]
         var name = range.getName()
         if (name.indexOf(sheetPrefix) >= 0) {
            name = tableNameMap[name] || name
            retVal[name] = range
         }
      }
      return retVal
   }

   /** For a given table, returns a list of ranges that the table monitors
    *  and treats like control changes
    */
   function getExternalTableRanges(sheet, tableConfig, controlOnly) {
     var globalControlTriggers =
      (TableRangeUtils_.getJson(tableConfig, [ "common", "global_control_triggers" ]) || [])
     var globalContentTriggers = !controlOnly ?
      (TableRangeUtils_.getJson(tableConfig, [ "common", "global_content_triggers" ]) || []) : []
     var globalTriggers = globalControlTriggers.concat(globalContentTriggers)
     var isGlobalQuery = "global" == TableRangeUtils_.getJson(tableConfig, [ "common", "query", "source" ])
     var globalQuery = TableRangeUtils_.getJson(tableConfig, [ "common", "query", "global", "range_name" ])
     if (isGlobalQuery) {
       globalTriggers = globalTriggers.concat([ globalQuery ])
     }
     return globalTriggers.map(function(rangeOrNotation) {
       return getRangeFromName(sheet, rangeOrNotation)
     }).filter(function(range) {
       return range != null
     })
   }

   /** Returns the range from a range notation
    * TODO: needs to be able to handle named ranges (see getJsonLookup)
   */
   function getRangeFromName(sheet, rangeOrNotation) {
     var isFullNotation = rangeOrNotation.indexOf("!") >= 0
     var isNotation = isFullNotation ||
      (rangeOrNotation.indexOf(":") >= 0 || /^[A-Z]+[0-9]+$/.exec(rangeOrNotation))

     return isNotation ?
       (isFullNotation ?
         sheet.getParent().getRange(rangeOrNotation)
         :
         sheet.getRange(rangeOrNotation)
       )
       : null //(see above: also support named ranges, cf getJsonLookup)
   }

   /** Utility function to write global status info out - returns true iff status _is_ global */
   function handleGlobalStatusInfo(sheet, statusInfo, tableConfig) {
     if ( //Global query, get from its external location:
       "global" == TableRangeUtils_.getJson(tableConfig, [ "common", "status", "position" ])
     ) {
       var globalSourceRef = TableRangeUtils_.getJson(
         tableConfig, [ "common", "status", "global", "range_name" ]
       )
       var globalSourceRange = globalSourceRef ?
         TableRangeUtils_.getRangeFromName(sheet, globalSourceRef) : null
       if (globalSourceRange) {
         globalSourceRange.getCell(1, 1).setValue(statusInfo)
         return true
       }
     }
     return false
   }

   ////////////////////////////////////////////////////////

   // 3] Internal utils

   /** Converts the table name into a pure alphanum string not starting with a digit */
   function buildTableRangeName_(tableName) {
      return tableName.replace(/^[0-9]/, '').replace(/[^a-zA-Z0-9]/g, "") + ManagementService_.managementSheetName()
   }

   /** Resizes range1 to ensure it fits in range 2 and clears extraneneous data/format */
   function resizeToTargetRange_(range1, range2) {
     var finalRange = range1
     var startHeight = finalRange.getNumRows()
     if (startHeight > range2.getNumRows()) {
       finalRange = finalRange.offset(0, 0, range2.getNumRows())
       finalRange.offset(range2.getNumRows() , 0, startHeight - range2.getNumRows()).clear()
     }
     var startWidth = finalRange.getNumColumns()
     if (startWidth > range2.getNumColumns()) {
       finalRange = finalRange.offset(0, 0, finalRange.getNumRows(), range2.getNumColumns())
       finalRange.offset(0 , range2.getNumColumns(),
        finalRange.getNumRows(), startWidth - range2.getNumColumns()
       ).clear()
     }
     return finalRange
   }

   ////////////////////////////////////////////////////////

   return {
     validateNewRange: validateNewRange,
     buildTableRange: buildTableRange,
     rebuildTableRange: rebuildTableRange,
     deleteTableRange: deleteTableRange,
     clearTableRanges: clearTableRanges,
     findTableRange: findTableRange,
     renameTableRange: renameTableRange,
     moveTableRange: moveTableRange,
     listTableRanges: listTableRanges,

     buildSpecialRowInfo: buildSpecialRowInfo,

     getJson: getJson,
     getOrPutJsonObj: getOrPutJsonObj,
     shallowCopy: shallowCopy,
     formatDate: formatDate,
     fixSelectAllRanges: fixSelectAllRanges,
     doRangesIntersect: doRangesIntersect,
     getExternalTableRanges: getExternalTableRanges,
     getRangeFromName: getRangeFromName,
     handleGlobalStatusInfo: handleGlobalStatusInfo,

     TESTONLY: {

     }
   }
 }())
