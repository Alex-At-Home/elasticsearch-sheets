/**
 * Handles all the integration between the client application and the ES configuration
 */

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

      var cols = json.response.columns
      var rows = json.response.rows
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
               cell.clear()
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
         for (var i = 0; i < numTableCols; ++i) {
            var cell = range.getCell(currRow, i + 1)
            if (i < numDataCols) {
               cell.setValue(rows[dataRowOffset][i])
            } else {
               cell.clear()
            }
         }
         dataRowOffset++
         currRow++
      }

      if (!paginationSetup && (dataRowOffset < numDataRows)) {
         warnings.push("Table not deep enough for all rows, needs to be [" + numDataRows + "], is only [" + dataRowOffset + "]")
      }

      if (context.table_meta.status_offset) {
         var warningText = ""
         if (warnings.length > 0) {
            warningText = " (WARNINGS = " + warnings.map(function(x) { return "[" + x + "]" }).join(", ") + ")"
         }
         setQueryResponseInStatus_(range, context.table_meta.status_offset, "SUCCESS" + warningText)
      }
   } else if (null != json.err) {
      var requestError = "ERROR: status = [" + json.status + "], msg = [" + json.err + "], sql = [" + sqlQuery + "]"
      if (context.table_meta.status_offset) {
         setQueryResponseInStatus_(range, context.table_meta.status_offset, requestError)
      } else { // pop up toaster
         showStatus("[" + tableName + "]: " + requestError, "Query Error")
      }
   }
}

// 2] Internals

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

/** Build the table outline + query bar/status info/pagination
 * returns:
 * { "query": string, "data_size": int, "page": int, <- these are used by the client to build the query
 *    status_offset: { row: int, col: int }, <- passed back post query completion to avoid double calling
 *    page_info_offset: { row: int, col: int } }  <- passed back post query completion to avoid double calling
 * (page starts at 1)
 */
function buildTableOutline_(tableName, tableConfig, activeRange, statusInfo) {

   var retVal = { } //(gets filled in as the method progresses)

   //TODO: formatting (how to unformat if table changing size?!)
   var formatTheme = getJson_(tableConfig, [ "common", "formatting", "theme" ]) || "none"

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

   var getRow = function(n) {
      if (n >= 0) {
         return n
      } else {
         return rangeRows + 1 + n
      }
   }

   var specialRows = buildSpecialRowInfo_(tableConfig)

   //TODO: handle switching between formats and styles
   //TODO: eg currently if I switch the header bar off it preserves the bold
   //TODO: copy data format from middle to any of the top 3/bottom 3 rows that aren't special

   // Query bar

   if (0 != specialRows.query_bar) {
      dataSize--

      var queryStart = 1
      var queryEnd = rangeCols
      var queryRow = getRow(specialRows.query_bar)
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
      queryTitleCell.setValue("Query:")
      // Query bar
      var queryCells = activeRange.offset(queryRow - 1, queryStart, 1, queryEnd - queryStart)
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
            if (retVal.status_offset) {
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
      var statusRow = getRow(specialRows.status)
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
      var headersRow = getRow(specialRows.headers)
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
      var paginationEnd = rangeCols
      var paginationRow = getRow(specialRows.pagination)
      if (specialRows.pagination == specialRows.status) { // status and query bar merged
          paginationEnd = paginationEnd - 2 //(2 cells for status)
      }
      // Unmerge everything on this row and clear format
      switch (formatTheme) {
         case "none":
            break
         default:
            activeRange.offset(paginationRow - 1, 0, 1).breakApart().clearFormat()
            break
      }
      // Page info
      var pageInfoCell = activeRange.getCell(paginationRow, 1)
      pageInfoCell.setValue("Page (of ???):")
      retVal.page_info_offset = { row: paginationRow, col: 2 }
      // Page offset
      var pageCell = activeRange.getCell(paginationRow, 2)
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
         if (null != statusInfo) {
           var statusCell = activeRange.getCell(paginationRow, paginationEnd + 2)
           statusCell.setValue(statusInfo)
         }
         retVal.status_offset = { row: paginationRow, col: paginationEnd + 2 }
      }
      switch (formatTheme) {
         case "none": break
         default:
            if (retVal.status_offset) {
               activeRange.getCell(paginationRow, paginationEnd + 1).setFontWeight("bold")
            }
            pageInfoCell.setFontWeight("bold")
            break
      }
   }
   retVal.data_size = dataSize
   return retVal
}
