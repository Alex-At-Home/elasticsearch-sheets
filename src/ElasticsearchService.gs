/**
 * Handles all the integration between the client application and the ES configuration
 */

//TODO: for fake pagination, grab size + 1 and then do "Page (of N):" or "Page (of >N):" if there are more options!

// 1] Service interface with client

/** Handles the user (re-)configuring Elasticsearch */
function configureElasticsearch(esConfig) {
   var mgmtService = getManagementService_()
   if (null == mgmtService) {
     createManagementService_(esConfig)
   } else {
      setEsMeta_(mgmtService, esConfig)
   }
}

/** Retrieves the ES info from the mangement service so the _client_ can perform the call. Also table info */
function getElasticsearchMetadata(tableName, tableConfig) {
   var mgmtService = getManagementService_()
   var ss = SpreadsheetApp.getActive()

   // ES metadata/validation

   var esInfo = getEsMeta_(mgmtService)

   // Table metadata/validation

   // Revalidate range:
   var tableRange = findTableRange_(ss, tableName)
   var range = null
   if (null == tableRange) { //(use current selection, test mode)
      range = ss.getActiveRange()
      if (null == range) {
         return null
      }
   } else {
      range = tableRange.getRange()
   }
   tableConfig.sheet = range.getSheet().getName()
   tableConfig.range = range.getA1Notation()
   if (!validateNewRange_(ss, tableConfig)) {
     return null
   }

   // Build table outline and add pending

   var statusInfo = "PENDING [" + new Date().toString() + "]"
   var tableMeta = buildTableOutline_(tableName, tableConfig, range, statusInfo)

   var retVal = { "es_meta": esInfo, "table_meta": tableMeta }

   return retVal
}

/** Populates the data table range with the given response (context comes from "getElasticsearchMetadata") */
function handleSqlResponse(tableName, tableConfig, context, json, sqlQuery) {

   var cols = []
   var rows = []
   if (null != json.response) {
      cols = json.response.columns
      rows = json.response.rows
   }
   handleRowColResponse_(tableName, tableConfig, context, json, sqlQuery, rows, cols, /*supportsSize*/false)
}

/** Populates the data table range with the given response (context comes from "getElasticsearchMetadata") */
function handleCatResponse(tableName, tableConfig, context, json, catQuery) {

   if (null != json.response) {
      var cols = []
      var rows = json.response
      if (rows.length > 0) {
        cols = Object.keys(rows[0]).map(function(x) { return { name: x } })
      }
   }
   handleRowColResponse_(tableName, tableConfig, context, json, catQuery, rows, cols, /*supportsSize*/true)
}

// 2] Internals

/** Generic row/col handler for ES responses - rows can be eother [ { }. ... ] or [ []. ...], cols: [ { name: }, ... ] */
function handleRowColResponse_(tableName, tableConfig, context, json, queryString, rows, cols, supportsSize) {

   var ss = SpreadsheetApp.getActive()
   var tableRange = findTableRange_(ss, tableName)
   var range = null
   if (null == tableRange) { //(use current selection, test mode
      range = ss.getActiveRange()
   } else {
      range = tableRange.getRange()
   }
   if (null != json.response) {
      var warnings = []

      var numDataCols = cols.length
      var numDataRows = rows.length

      var currRow = 1
      var numTableRows = range.getNumRows()
      var numTableCols = range.getNumColumns()

      // Get special row info:
      var specialRows = buildSpecialRowInfo_(tableConfig)

      //TODO: handle skipping specified rows and cols

      // Handle headers (if enabled)
      if (numTableCols < numDataCols) {
         warnings.push("Table not wide enough for all columns, needs to be [" + numDataCols + "], is only [" + numTableCols + "]")
      }

      if (specialRows.headers != 0) {
         for (var i = 0; i < numTableCols; ++i) {
            var cell = range.getCell(specialRows.headers, i + 1)
            if (i < numDataCols) {
               cell.setValue(cols[i].name)
            } else {
               cell.clearContent()
            }
         }
      }

      var paginationSetup = (specialRows.pagination != 0)
      var dataRowOffset = 0
      if (paginationSetup) {
         dataRowOffset = (context.table_meta.page - 1)*context.table_meta.data_size
      }

      convertSpecialRows_(specialRows, numTableRows)

      // Write data
      while ((dataRowOffset < numDataRows) && (currRow <= numTableRows)) {
         if ((currRow == specialRows.pagination) || (currRow == specialRows.headers) ||
             (currRow == specialRows.status) || (currRow == specialRows.query_bar))
         {
            currRow++
            continue
         }
         var row = rows[dataRowOffset]
         var rowIsArray = Array.isArray(row)
         for (var i = 0; i < numTableCols; ++i) {
            var cell = range.getCell(currRow, i + 1)
            if (i < numDataCols) {
               cell.setValue(rowIsArray ? row[i] : row[cols[i].name])
            } else {
               cell.clearContent()
            }
         }
         dataRowOffset++
         currRow++
      }

      // Handle - more/less data than we can write?
      if (dataRowOffset < numDataRows) { // still have data left to write
         if (paginationSetup) { // fake pagination but we can use this to tell users if there is more data or not
            var pageInfoCell = range.getCell(context.table_meta.page_info_offset.row, context.table_meta.page_info_offset.col - 1)
            if (supportsSize) {
              var actualPages = Math.ceil(numDataRows/context.table_meta.data_size)
               pageInfoCell.setValue("Page (of " + actualPages + "):")
            } else {
               pageInfoCell.setValue("Page (of > " + context.table_meta.page + "):")
            }
         } else {
            warnings.push("Table not deep enough for all rows, needs to be [" + numDataRows + "], is only [" + dataRowOffset + "]")
         }
      } else {
        // Clear remaining data rows:
        var rowsLeft = numTableRows - (currRow + 1)
        if (rowsLeft > 0) {
           range.offset(currRow, 0, rowsLeft).clearContent()
        }
        // Update pagination
        if (paginationSetup) {
           range.getCell(context.table_meta.page_info_offset.row, context.table_meta.page_info_offset.col - 1)
              .setValue("Page (of " + context.table_meta.page + "):")
        }
      }

      // Write warnings to status (never to toaster)
      if (context.table_meta.status_offset) {
         var warningText = ""
         if (warnings.length > 0) {
            warningText = " (WARNINGS = " + warnings.map(function(x) { return "[" + x + "]" }).join(", ") + ")"
         }
         setQueryResponseInStatus_(range, context.table_meta.status_offset, "SUCCESS" + warningText)
      }
   } else if (null != json.err) { // Write errors to status or toaster
      var requestError = "ERROR: status = [" + json.status + "], msg = [" + json.err + "], query = [" + queryString + "]"
      if (context.table_meta.status_offset) {
         setQueryResponseInStatus_(range, context.table_meta.status_offset, requestError)
      } else { // pop up toaster
         showStatus("[" + tableName + "]: " + requestError, "Query Error")
      }
   }
}

/** Adds the error info the status, if necessary */
function setQueryResponseInStatus_(range, statusLocation, errorString) {
   range.getCell(statusLocation.row, statusLocation.col).setValue(errorString)
}

/** Turns logical rows into actual rows */
function convertSpecialRows_(specialRows, numTableRows) {
   var getRow = function(n) {
      if (n >= 0) {
         return n
      } else {
         return numTableRows + 1 + n
      }
   }
   specialRows.headers = getRow(specialRows.headers)
   specialRows.status = getRow(specialRows.status)
   specialRows.pagination = getRow(specialRows.pagination)
   specialRows.query_bar = getRow(specialRows.query_bar)
}

/** Infers the data row formats and copies over possible ex-special row formats */
function resetExSpecialRowFormats_(activeRange, specialRows, formatTheme) {

   var rangeRows = activeRange.getNumRows()

   // Simple attempt at ensuring format is preserved
   var dataFormatRowSample = null
   var dataFormatRowSampleOffset = null
   if ("minimal" == formatTheme) {
      if (rangeRows >= 8) { // Find the first guaranteed data row
         dataFormatRowSampleOffset = 4
      } else { // (small table, make a game attempt to find a data row)
        for (var ii = 1; ii <= rangeRows - 1; ++ii) {
           if (activeRange.getCell(ii, 1).getValue().indexOf(":") < 0) {
              // (jump one more row since it could be the header, note offset and getCell have different first index)
              dataFormatRowSampleOffset = ii
              break
           }
        }
      }
      if (null != dataFormatRowSampleOffset) {
           dataFormatRowSample = activeRange.offset(dataFormatRowSampleOffset, 0, 1)

           // Now going to copy the data format to any of the first 4 or last 4
           var maybeCopyRow = function(ii) {
              if ((ii != specialRows.status) && (ii != specialRows.pagination) &&
                  (ii != specialRows.headers) && (ii != specialRows.query_bar) && ((ii + 1) != dataFormatRowSampleOffset))
              {
                 var offset = activeRange.offset(ii - 1, 0, 1)
                 dataFormatRowSample.copyTo(offset, {formatOnly:true})
              }
           }
           for (var ii = 1; ii <= 4; ++ii) { // top 4
              maybeCopyRow(ii)
           }
           for (var ii = rangeRows; (ii > rangeRows - 4) && (ii > 4); --ii) { // bottom 4, minus overlaps
              maybeCopyRow(ii)
           }
      }
   }

}

/** Build the table outline + query bar/status info/pagination
 * returns:
 * { "query": string, "data_size": int, "page": int, <- these are used by the client to build the query
 *    status_offset: { row: int, col: int }, <- passed back post query completion to avoid double calling
 *    page_info_offset: { row: int, col: int } }  <- passed back post query completion to avoid double calling
 * (page starts at 1)
 */
function buildTableOutline_(tableName, tableConfig, activeRange, statusInfo) {

   var retVal = { } //(gets filled in as the method progresses)

/*
  var specialRows = {
     query_bar: 0,
     pagination: 0,
     status: 0,
     headers: 0,
     //is_merged
     //min_height
     //min_width
     //skip_rows
     //skip_cols
  }
*/
   var rangeRows = activeRange.getNumRows()
   var rangeCols = activeRange.getNumColumns()

   var dataSize = rangeRows
   var formatTheme = getJson_(tableConfig, [ "common", "formatting", "theme" ]) || "none"

   var getRow = function(n) {
      if (n >= 0) {
         return n
      } else {
         return rangeRows + 1 + n
      }
   }

   var specialRows = buildSpecialRowInfo_(tableConfig)
   convertSpecialRows_(specialRows, rangeRows)

   // How we handle formatting:
   // none - complately manual
   // minimal - we manage the header rows (just bold, no background - some borders in the future)
   // (in the future, a more colorful headers management, and also manage data with alternating rows)
   resetExSpecialRowFormats_(activeRange, specialRows, formatTheme)

   // Query bar

   if (0 != specialRows.query_bar) {
      dataSize--

      var queryStart = 1
      var queryEnd = rangeCols
      var queryRow = specialRows.query_bar
      if (specialRows.query_bar == specialRows.status) { // status and query bar merged
          queryEnd = queryEnd - 2 //(2 cells for status)
      }
      // Unmerge everything on this row and clear format
      switch (formatTheme) {
         case "none":
            break
         default:
            activeRange.offset(queryRow - 1, 0, 1).breakApart().clearFormat()
            break
      }
      // Query title:
      var queryTitleCell = activeRange.getCell(queryRow, 1)
      var replaceCurrentQuery = "Query:" == queryTitleCell.getValue()
      if (!replaceCurrentQuery) {
         queryTitleCell.setValue("Query:")
      }
      // Query bar
      var queryCells = activeRange.offset(queryRow - 1, queryStart, 1, queryEnd - queryStart)
      if (!replaceCurrentQuery) {
         queryCells.setValue("")
      }
      retVal.query = queryCells.getValue()
      // Status:
      if (specialRows.query_bar == specialRows.status) {
         var statusTitleCell = activeRange.getCell(queryRow, queryEnd + 1)
         statusTitleCell.setValue("Status:")
         if (null != statusInfo) {
           var statusCell = activeRange.getCell(queryRow, queryEnd + 2)
           statusCell.setValue(statusInfo)
         }
         retVal.status_offset = { row: queryRow, col: queryEnd + 2 }
      }
      switch (formatTheme) {
         case "none": break
         default:
            if (specialRows.query_bar == specialRows.status) {
               activeRange.getCell(queryRow, queryEnd + 1).setFontWeight("bold")
            }
            queryTitleCell.setFontWeight("bold")
            queryCells.merge()
            break
      }
   }

   // Status (if not merged)

   if ((0 != specialRows.status) && (!specialRows.is_merged)) {
      dataSize--

      var statusStart = 1
      var statusEnd = rangeCols
      var statusRow = specialRows.status
      // Unmerge everything on this row and clear format
      switch (formatTheme) {
         case "none":
            break
         default:
            activeRange.offset(statusRow - 1, 0, 1).breakApart().clearFormat()
            break
      }
      // Status title:
      var statusTitleCell = activeRange.getCell(statusRow, 1)
      statusTitleCell.setValue("Status:")
      // Status info
      var statusCells = activeRange.offset(statusRow - 1, statusStart, 1, statusEnd - statusStart)
      if (null != statusInfo) {
          statusCells.setValue(statusInfo)
      }
      retVal.status_offset = { row: statusRow, col: 2 }

      switch (formatTheme) {
         case "none": break
         default:
            statusTitleCell.setFontWeight("bold")
            statusCells.merge()
            break
      }
   }

   // Headers

   if (0 != specialRows.headers) {
      dataSize--
      var headersRow = specialRows.headers
      // Unmerge everything on this row, clear format, and set to bold
      switch (formatTheme) {
         case "none":
            break
         default:
            activeRange.offset(headersRow - 1, 0, 1).breakApart().clearFormat().setFontWeight("bold")
            break
      }
   }

   // Pagination

   if (0 != specialRows.pagination) {
      dataSize--

      var paginationStart = 1
      var paginationEnd = 2
      var paginationRow = specialRows.pagination
      // Unmerge everything on this row and clear format
      switch (formatTheme) {
         case "none":
            break
         default:
            activeRange.offset(paginationRow - 1, 0, 1).breakApart().clearFormat()
            activeRange.offset(paginationRow - 1, 2, 1, rangeCols - 2).clear()
            break
      }
      // Page info
      var pageInfoCell = activeRange.getCell(paginationRow, 1)
      var replaceCurrentPage = 0 != pageInfoCell.getValue().indexOf("Page (")
      pageInfoCell.setValue("Page (of ???):")
      retVal.page_info_offset = { row: paginationRow, col: 2 }
      // Page offset
      var pageCell = activeRange.getCell(paginationRow, 2)
      if (replaceCurrentPage) {
         pageCell.setValue(1)
      }
      var currPage = parseInt(pageCell.getValue())
      if (!currPage || (NaN == currPage) || ("" == currPage)) {
         currPage = 1
         pageCell.setValue("" + currPage)
      }
      retVal.page = currPage

      // Status:
      if (specialRows.pagination == specialRows.status) {
         var statusTitleCell = activeRange.getCell(paginationRow, paginationEnd + 1)
         statusTitleCell.setValue("Status:")
         var statusCell = activeRange.getCell(paginationRow, paginationEnd + 2)
         if (null != statusInfo) {
           statusCell.setValue(statusInfo)
         }
         retVal.status_offset = { row: paginationRow, col: paginationEnd + 2 }
      }
      switch (formatTheme) {
         case "none": break
         default:
            if (specialRows.pagination == specialRows.status) {
               activeRange.getCell(paginationRow, paginationEnd + 1).setFontWeight("bold")
               activeRange.offset(paginationRow - 1, paginationEnd + 1, 1, rangeCols - paginationEnd - 1).merge()
            }
            pageInfoCell.setFontWeight("bold")
            break
      }
   }
   retVal.data_size = dataSize
   return retVal
}
