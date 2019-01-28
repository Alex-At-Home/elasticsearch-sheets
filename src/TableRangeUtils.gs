/*
 * TableRangeUtils.gs - manages named data ranges corresponding to data tables
 */

/** Safe way of getting a json element safely */
function getJson_(json, fieldArray) {
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

/** Converts the table name into a pure alphanum string not starting with a digit */
function buildTableRangeName_(tableName) {
   return tableName.replace(/^[0-9]/, '').replace(/[^a-zA-Z0-9]/g, "") + managementSheetName_
}

/** Builds the location of the query/status/header/pagination rows */
function buildSpecialRowInfo_(configJson) {
  var headers = getJson_(configJson, [ "common", "headers" ])
  var status = getJson_(configJson, [ "common", "status" ]) || {}
  var queryBar = getJson_(configJson, [ "common", "query" ]) || {}
  var localQueryBar = (queryBar.source == "local") ? (queryBar.local || {}) : {}
  var pagination = getJson_(configJson, [ "common", "pagination" ] ) || {}
  var localPaginationBar = (pagination.source == "local") ? (pagination.local || {}) : {}

  var specialRows = {
     query_bar: 0,
     status: 0,
     headers: 0,
     pagination: 0
     //is_merged - filled in later
     //min_height - filled in later
     //min_width - filled in later
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

/** Validates that the range specified by the JSON is valid */
function validateNewRange_(ss, configJson) {
   var newRangeNotation = configJson.range
   var newSheetName = configJson.sheet
   if (!newSheetName && !newRangeNotation) {
      // No new range specified, all is good
      return true
   }
   if (!newSheetName || !newRangeNotation) {
      // If specifying one, have to specify the other
      showStatus("If manually specifying range, need to specify both 'range' and 'sheet'", "Server Error")
      return false
   }
   // Both are specified, let's check they are valid
   var newSheet = ss.getSheetByName(newSheetName)
   if (managementSheetName_ == ss.getActiveSheet().getName()) {
      showStatus("Cannot build data table on management sheet", "Server Error")
      return false
   } else if (null == newSheet) {
      showStatus("No sheet named: [" + newSheetName + "]", "Server Error")
      return false
   } else if (null == newSheet.getRange(newRangeNotation)) {
      showStatus("Invalid range notation, should be eg 'A1:F10': [" + newRangeNotation + "]", "Server Error")
      return false
   } else {
      // Check range vs width
      var specialRowInfo = buildSpecialRowInfo_(configJson)
      var minWidth = specialRowInfo.min_width
      var minHeight = specialRowInfo.min_height
      var newRange = newSheet.getRange(newRangeNotation)
      if ((newRange.getHeight() < minHeight) || (newRange.getWidth() < minWidth)) {
         showStatus("Need at least a "+minHeight+"x"+minWidth+" grid to build this table: [" + newRangeNotation + "] is too small", "Server Error")
         return false
      }
      //TODO: maybe validate if the special rows are sane?
   }
   return true
}

/** Builds a named range for the data table */
function buildTableRange_(ss, tableName, mutableConfigJson) {

  // Fill in $.range and $.sheet
  if (mutableConfigJson.range || mutableConfigJson.sheet) {
     showStatus("Cannot specify range or sheet when creating a table - build a range in the desired sheet first", "Server Error")
     return false
  }
  var currActive = ss.getActiveSheet()
  var range = currActive.getActiveRange()
  var rangeNotation = range.getA1Notation()
  var sheetName = range.getSheet().getName()

  mutableConfigJson.range = rangeNotation
  mutableConfigJson.sheet = sheetName

  // Validate and build range if possible
  if (!validateNewRange_(ss, mutableConfigJson)) {
     return false
  } else {
     ss.setNamedRange(buildTableRangeName_(tableName), range)
     return true
  }
}

/** Builds a table range from JSON */
function rebuildTableRange_(ss, tableName, configJson) {
   var newRange = ss.getSheetByName(configJson.sheet).getRange(configJson.range)
   ss.setNamedRange(buildTableRangeName_(tableName), newRange)
}

/** Deletes the named range corresponding to the data table (ie as part of deleting the data table) */
function deleteTableRange_(ss, tableName) {
   var matchingRange = findTableRange_(ss, tableName)
   if (null != matchingRange) {
      matchingRange.getRange().clear()
      ss.removeNamedRange(buildTableRangeName_(tableName))
   }
}

/** Returns a table range, or null if one doesn't exist */
function findTableRange_(ss, tableName) {
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
function renameTableRange_(ss, oldName, newName) {
   var matchingRange = findTableRange_(ss, oldName)
   if (null != matchingRange) {
      matchingRange.setName(buildTableRangeName_(newName))
   }
}

//TODO: what to do with user fields in here? need some defensive logic

/** Move a named range (new range is pre-validated) */
function moveTableRange_(ss, tableName, configJson) {
   if (!validateNewRange_(ss, configJson)) {
      return false
   }
   var newRangeNotation = configJson.range
   var newSheetName = configJson.sheet
   if (newRangeNotation && newSheetName) { //(null means "leave alone")
     // If we get to here then the range has already been validated
     var currMatchingRange = findTableRange_(ss, tableName)
     if (null != currMatchingRange) {
        // Build a new range
        var currSheetWithRange = currMatchingRange.getRange().getSheet()
        if ((currSheetWithRange.getName() != newSheetName) ||
               (currMatchingRange.getRange().getA1Notation().toLowerCase() != newRangeNotation.toLowerCase()))
        {
          var newRange = ss.getSheetByName(newSheetName).getRange(newRangeNotation)

          // Clear old range:
          currMatchingRange.getRange().clear()
          // Overwrite range:
          currMatchingRange.setRange(newRange)
        }
     }
  }
  return true
}
