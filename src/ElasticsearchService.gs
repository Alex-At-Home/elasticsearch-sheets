/**
 * Handles all the integration between the client application and the ES configuration
 */

// 1] Service interface with client

/** Retrieves the ES info from the mangement service so the _client_ can perform the call. Also table info */
function getElasticsearchMetadata(tableName) {

  var mgmtService = getManagementService_()
  var esInfo = getEsMeta_(mgmtService)

   //TODO: global query info, sizing, etc
  var retVal = { "es_meta": esInfo, "table_meta": {} } //TODO

   //TODO if there is status enabled then set the data table status to "pending"

  return retVal
}

/** Populates the data table range with the given response (context comes from "getElasticsearchMetadata") */
function handleSqlResponse(tableName, tableConfig, context, json) {

   var ss = SpreadsheetApp.getActive()
   var tableRange = findTableRange_(ss, tableName)
   if (null == tableRange) { //(nothing to do)
      return
   }
   if (null != json.response) {

      var warnings = []

      var cols = json.response.columns
      var rows = json.response.rows
      var numDataCols = cols.length
      var numDataRows = rows.length

      var range = tableRange.getRange()

      var startRow = 1
      var numTableRows = range.getNumRows()
      var numTableCols = range.getNumColumns()

      // Handle headers (if enabled)
      if (numTableCols < numDataCols) {
         warnings.put("Table not wide enough for all columns, needs to be [" + numDataCols + "], is only [" + numTableCols + "]")
      }

      //TODO: skip specified rows and cols

      if (true) {
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
         warnings.put("Table not deep enough for all rows, needs to be [" + numDataRows + "], is only [" + j + "]")
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

//TODO
