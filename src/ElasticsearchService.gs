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
function handleSqlResponse(tableName, tableConfig, context, json) {

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

      var startRow = 1
      var numTableRows = range.getNumRows()
      var numTableCols = range.getNumColumns()

      // Get special row info:
      var specialRows = buildSpecialRowInfo_(tableConfig)

      // Handle headers (if enabled)
      if (numTableCols < numDataCols) {
         warnings.push("Table not wide enough for all columns, needs to be [" + numDataCols + "], is only [" + numTableCols + "]")
      }

      //TODO: skip specified rows and cols

      if (specialRows.headers != 0) {
         for (var i = 0; i < numTableCols; ++i) {
            var cell = range.getCell(startRow, i + 1)
            if (i < numDataCols) {
               cell.setFontWeight("bold")
               cell.setValue(cols[i].name)
            } else {
               cell.clear()
            }
         }
         startRow++
      }

      // Write data
      for (var j = 0; j <= (numTableRows - startRow); ++j) {
         for (var i = 0; i < numTableCols; ++i) {
            var cell = range.getCell(j + startRow, i + 1)
            if ((i < numDataCols) && (j < numDataRows)) {
               cell.setValue(rows[j][i])
            } else {
               cell.clear()
            }
         }
      }
      var paginationSetup = false
      if (paginationSetup) {
         //TODO add pagination info
      } else if (j < numDataRows) {
         warnings.push("Table not deep enough for all rows, needs to be [" + numDataRows + "], is only [" + j + "]")
      }

      if (false) {
         //TODO: put status info into the table if configured
      }
   } else if (null != json.err) {
      var requestError = "ERROR: status = [" + json.status + "], msg = [" + json.err + "]"
      if (false) {
         //TODO put error into data table
      }
      showStatus("[" + tableName + "]: " + requestError, "Query Error")
   }
}

// 2] Internals

/** Build the table outline + query bar/status info/pagination
 * returns:
 * { "query": string, "data_size": int, "page": int, <- these are used by the client to build the query
 *    status_offset: { row: int, col: int }, <- passed back post query completion to avoid double calling
 *    page_info_offset: { row: int, col: int } }  <- passed back post query completion to avoid double calling
 * (page starts at 1)
 */
function buildTableOutline_(tableName, tableConfig, activeRange, statusInfo) {

   var retVal = { } //(gets filled in as the method progresses)

   //TODO: borders (how to unformat borders if table changing size?!)
   var doBorders = getJson_(tableConfig, [ "common", "borders", "style" ]) || "none"

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

   // Query bar

   if (0 != specialRows.query_bar) {
      dataSize--

      var queryStart = 1
      var queryEnd = rangeCols
      var queryRow = getRow(specialRows.query_bar)
      if (specialRows.query_bar == specialRows.status) { // status and query bar merged
          queryEnd = queryEnd - 2 //(2 cells for status)
      }
      // Unmerge everything on this row
      activeRange.offset(queryRow, 0, 1).breakApart()
      // Query title:
      var queryTitleCell = activeRange.getCell(queryRow, 1)
      queryTitleCell.setValue("Query:")
      // Query bar
      var queryCells = activeRange.offset(queryRow, 1, 1, queryEnd - queryStart).merge()
      retVal.query = queryCells.getValue()
      // Status:
      if (specialRows.query_bar == specialRows.status) {
         var statusTitleCell = activeRange.getCell(queryRow, queryEnd + 1)
         statusTitleCell.setValue("Status:")
         if (null != statusInfo) {
           var statusCell = activeRange.getCell(queryRow, queryEnd + 2)
           statusTitleCell.setValue(statusInfo)
         }
         retVal.status_offset = { row: queryRow, col: queryEnd + 2 }
      }
   }

   // Status (if not merged)

   if ((0 != specialRows.status) && (!specialRows.is_merged)) {
      dataSize--

      var statusStart = 1
      var statusEnd = rangeCols
      var statusRow = getRow(specialRows.status)
      // Unmerge everything on this row
      activeRange.offset(queryRow, 0, 1).breakApart()
      // Status title:
      var statusTitleCell = activeRange.getCell(statusRow, 1)
      queryTitleCell.setValue("Status:")
      // Status info
      var statusCells = activeRange.offset(statusRow, 1, 1, statusEnd - statusStart).merge()
      if (null != statusInfo) {
          statusCells.setValue(statusInfo)
      }
      retVal.status_offset = { row: statusRow, col: 2 }
   }

   // Headers

   if (0 != specialRows.headers) {
      dataSize--
      //(nothing else to do for now)
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
      // Unmerge everything on this row
      activeRange.offset(paginationRow, 0, 1).breakApart()
      // Page offset
      var pageCell = activeRange.getCell(paginationRow, 1)
      var currPage = parseInt(pageCell.getValue())
      if (!currPage || (NaN == currPage) || ("" == currPage)) {
         currPage = 1
         pageCell.setValue("" + currPage)
      }
      retVal.page = currPage
      // Page info
      var pageInfoCell = activeRange.getCell(paginationRow, 2)
      pageInfoCell.setValue("of ???")
      retVal.page_info_offset = { row: paginationRow, col: 1 }

      // Status:
      if (specialRows.pagination == specialRows.status) {
         var statusTitleCell = activeRange.getCell(paginationRow, paginationEnd + 1)
         statusTitleCell.setValue("Status:")
         if (null != statusInfo) {
           var statusCell = activeRange.getCell(paginationRow, paginationEnd + 2)
           statusTitleCell.setValue(statusInfo)
         }
         retVal.status_offset = { row: paginationRow, col: paginationEnd + 2 }
      }
   }
   retVal.data_size = dataSize
   return retVal
}
