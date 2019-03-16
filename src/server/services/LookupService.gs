/*
 * LookupService.gs - manages lookup table related interactions
 */

var LookupService_ = (function(){

  ////////////////////////////////////////////////////////

  /** A list of named data ranges that aren't tables */
  function listCandidateDataRanges() {
    var ss = SpreadsheetApp.getActive()
    var prefix = ManagementService_.managementSheetName()
    return ss.getNamedRanges().filter(function(range) {
      return range.getName().indexOf(prefix) != 0
    })
  }

  /** Get a JSON object with keys taken from the first column, headers from first row */
  function getJsonLookup(rangeOrNotation) {

    // Find the specified range:

    var isNotation = rangeOrNotation.indexOf(":") >= 0
    var isFullNotation = rangeOrNotation.indexOf("!") >= 0
    var ss = SpreadsheetApp.getActive()
    var findRange = function() {
      var candidates = listCandidateDataRanges().filter(function(el) {
        return el.getName() == rangeOrNotation
      }).map(function(el) {
        return el.getRange()
      })
      return (candidates.length > 0) ? candidates[0] : null
    }

    var range = isNotation ?
      (isFullNotation ?
        ss.getRange(rangeOrNotation)
        :
        ss.getActiveSheet().getRange(rangeOrNotation)
      )
      :
      findRange()

    if (!range || (range.getNumColumns() < 1) || (range.getNumRows() < 1)) {
      return { error: "Named range [" + rangeOrNotation + "] not found (or A1 notation invalid)" }
    }

    // OK we found the range. now assume the first line is a header and turn into JSON

    var headers = {}
    var headerRange = range.offset(0, 0, 1).getDisplayValues()[0]
    headerRange.forEach(function(headerCol, index) {
      if (headerCol) {
        headers[headerCol] = index
      }
    })
    if (0 == headers.length) {
      return { error: "Must be at least one non-null 'header' in first row" }
    }

    var json = {}
    var lookupRange = range.offset(1, 0).getValues()
    lookupRange.forEach(function(row) {
      var jsonRow = {}
      Object.keys(headers).forEach(function(headerName, ii) {
        var index = headers[headerName]
        if (0 == ii) {
          if (row[index]) { //(else skip this row)
            json[row[index]] = jsonRow
          }
        } else {
          jsonRow[headerName] = row[index]
        }
      })
    })
    return json
  }

  /** If the range is identical to an existing name range return that, else return the a1 notation */
  function getNamedRangeOrNotation(range) {
    var rangeList = listCandidateDataRanges().filter(function(namedRange) {
      return namedRange.getRange().getA1Notation() == range.getA1Notation()
    }).map(function(namedRange) { return namedRange.getName() })

    if (rangeList.length > 0) {
      return rangeList[0]
    } else {
      return range.getA1Notation()
    }
  }


  ////////////////////////////////////////////////////////

  return {
    listCandidateDataRanges: listCandidateDataRanges,
    getJsonLookup: getJsonLookup,
    getNamedRangeOrNotation: getNamedRangeOrNotation,

    TESTONLY: {

    }
  }

}())
