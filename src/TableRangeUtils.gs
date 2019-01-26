/*
 * TableRangeUtils.gs - manages named data ranges corresponding to data tables
 */

/** Converts the table name into a pure alphanum string not starting with a digit */
function buildTableRangeName_(tableName) {
   return tableName.replace(/^[0-9]/, '').replace(/[^a-zA-Z0-9]/g, "") + managementSheetName_
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
      var newRange = newSheet.getRange(newRangeNotation)
      if ((newRange.getHeight() < 4) || (newRange.getWidth() < 4)) {
         showStatus("Need at least a 4x4 grid to build a data table: [" + newRangeNotation + "] is too small", "Server Error")
         return false
      }
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
