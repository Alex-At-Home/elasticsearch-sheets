/**
 * Handles service-level calls as part of  the integration between the client application and the ES configuration
 */

 //TODO: -------- short term: -------------------

//TODO: would be nice to have a "easy_composite" element that takes the next N terms and adds them to a composite

//TODO: one time the expand editor didn't appear to save my changes (I hit update immediately, not sure if that's related)

//TODO: if MR has nested set/map (?list), then it doesn't get rendered...

//TODO: -------- Longer term: -------------------

//TODO: memory leak might be a problem?

//TODO: handleRowColResponse _badly_ needs some unit tests :(

//TODO: offload more processing into browser via shared files

//TODO: once the mapping is pulled from non-SQL, can use it to create cols without needing ~2 passes over the data

//TODO: would be nice to have a data summary table, 1 row per field with stats

//TODO: allow specification of data type per col (including JSON, prettyJSON)

//TODO: stash for at least the build new table should be user metadata not in the spreadsheet

var ElasticsearchService_ = (function() {

  ////////////////////////////////////////////////////////

  // 1] Configuration

  /** Handles the user (re-)configuring Elasticsearch */
  function configureElasticsearch(esConfig) {
     if (!ManagementService_.isManagementServiceCreated()) {
       ManagementService_.createManagementService(esConfig)
     } else {
        ManagementService_.setEsMeta(esConfig)
     }
  }

  // 2] Pre-request logic

  /** Update the status field of tables that have changed */
  function markTableAsPending(tableName) {
    try {
      var savedObjects = ManagementService_.listSavedObjects(/*discardRange*/false)
      var tableConfig = savedObjects[tableName]
      if (tableConfig.temp) {
        tableConfig = tableConfig.temp
      }
      if (tableConfig) {
        var ss = SpreadsheetApp.getActive()
        var tableRange = TableRangeUtils_.findTableRange(ss, tableName)
        if (tableRange) {
          var range = tableRange.getRange()
          var statusInfo = "AWAITING REFRESH [" + TableRangeUtils_.formatDate() + "]"
          var tableMeta = ElasticsearchRequestUtils_.buildTableOutline(tableName, tableConfig, range, statusInfo, /*testMode*/false)
        }
      }
    } catch (err) {} //(fire and forget, just for display)
  }

  /** Retrieves the ES info from the mangement service so the _client_ can perform the call. Also table info */
  function getElasticsearchMetadata(tableName, tableConfig, testMode) {
     var ss = SpreadsheetApp.getActive()

     // ES metadata/validation

     var esInfo = ManagementService_.getEsMeta()
     if (null == tableConfig) { // All I want is the ES metadata
        return { "es_meta": esInfo }
     }

     // Table metadata/validation

     // Revalidate range:
     var tableRange = TableRangeUtils_.findTableRange(ss, tableName)
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

     // Special case, full selection from partial selections:
     if (null == tableRange) {
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
     }

     if (!TableRangeUtils_.validateNewRange(ss, tableConfig)) {
       return null
     }

     // Build table outline and add pending

     var statusInfo = "PENDING [" + TableRangeUtils_.formatDate() + "]"
     var tableMeta = ElasticsearchRequestUtils_.buildTableOutline(tableName, tableConfig, range, statusInfo, testMode)

     // We've not set the status to pending, so clear any triggers:
     if (!testMode && (null != tableRange)) {
       ManagementService_.setSavedObjectTrigger(tableName, "")
     }

     // Add lookup info
     var lookups = findLookups_(tableConfig)
     Object.keys(lookups).forEach(function(fullString) {
       var nameOrNotation = lookups[fullString]
       lookups[fullString] = LookupService_.getJsonLookup(nameOrNotation)
     })
     if (lookups && (Object.keys(lookups).length > 0)) {
       tableMeta.lookups = lookups
     }
     var retVal = { "es_meta": esInfo, "table_meta": tableMeta }

     return retVal
  }

  /** Builds an aggregation query from the UI focused config model */
  function buildAggregationQuery(config, querySubstitution) {
    return ElasticsearchRequestUtils_.buildAggregationQuery(config, querySubstitution)
  }

  // 3] Post request logic

  /** Populates the data table range with the given SQL response (context comes from "getElasticsearchMetadata") */
  function handleSqlResponse(tableName, tableConfig, context, json, sqlQuery) {

     var cols = []
     var rows = []
     if (null != json.response) {
        cols = json.response.columns.map(function(col, index) {
          col.index = index //(allows re-ordering fields)
          return col
        })
        rows = json.response.rows
     }
     ElasticsearchResponseUtils_.handleRowColResponse(tableName, tableConfig, context, json, rows, cols, /*supportsSize*/false)
  }

  /** Populates the data table range with the given "_cat" response (context comes from "getElasticsearchMetadata") */
  function handleCatResponse(tableName, tableConfig, context, json, catQuery) {

     if (null != json.response) {
        var cols = []
        var rows = json.response
        if (rows.length > 0) {
          cols = Object.keys(rows[0]).map(function(x) { return { name: x } })
        }
     }
     ElasticsearchResponseUtils_.handleRowColResponse(tableName, tableConfig, context, json, rows, cols, /*supportsSize*/true)
  }

  /** Populates the data table range with the given aggregation response (context comes from "getElasticsearchMetadata") */
  function handleAggregationResponse(tableName, tableConfig, context, json, aggQueryJson) {
    var rowsCols = { rows: [], cols: [] }
    try {
       if (null != json.response) {
          rowsCols = ElasticsearchResponseUtils_.buildRowColsFromAggregationResponse(
            tableName, tableConfig, context, json, aggQueryJson
          )
      }
    } catch (err) {
      json.response = null
      json.error_message = err.message
      json.query_string = JSON.stringify(aggQueryJson)
    }
    ElasticsearchResponseUtils_.handleRowColResponse(tableName, tableConfig, context, json, rowsCols.rows, rowsCols.cols, /*supportsSize*/true)
  }

  /** Populates the data table range with the given query response (context comes from "getElasticsearchMetadata") */
  function handleDataResponse(tableName, tableConfig, context, json, queryJson) {
    var rowsCols = { rows: [], cols: [] }
    var numHits = 0
    try {
       if (null != json.response) {
          numHits =  TableRangeUtils_.getJson(json.response || {}, [ "hits", "total" ]) || 0
          rowsCols = ElasticsearchResponseUtils_.buildRowColsFromDataResponse(
            tableName, tableConfig, context, json, queryJson
          )
      }
    } catch (err) {
      json.response = null
      json.error_message = err.message
      json.query_string = JSON.stringify(queryJson)
    }
    ElasticsearchResponseUtils_.handleRowColResponse(
      tableName, tableConfig, context, json, rowsCols.rows, rowsCols.cols, /*supportsSize*/true,
      numHits
    )
  }

  // User defined function

  /** Summarizes a varargs of strings/JSON */
  function summarizeEsSubTable(args) {
    var len = args.length
    var sample = args[0]
    if (sample.length > 64) {
      sample = sample.substring(0, 61) + "..."
    }
    var retVal = "[ " + len + " " + "value(s)" + ", sample: '" + sample + "']"
    return retVal
  }

  /** Builds a sub-table out of a summary object */
  function buildEsSubTable(subTableCell, configOverride) {
    var ss = SpreadsheetApp.getActive()
    var formula = SpreadsheetApp.getActiveRange().getFormula()
    try {
      var targetCell = formula.match(/=buildEsSubTable *\(([^,]*)(?:,.*)?\)/i)[1]
    } catch (err) {
      throw new Error(
        "Expect cell contents to be [buildEsSubTable(single-cell-range[, override])], vs ["
        + formula + "]"
      )
    }
    try {
      var range = ss.getRange(targetCell)
    } catch(err) {
      throw new Error(targetCell + ' is not a valid range')
    }
    var cellVal = range.getFormula()
    var cellValToArrayStr = cellVal
      .replace("=summarizeEsSubTable(", "[")
      .replace(/[)] *$/, "]")
      .replace(/["]["]/g, "\\\"")

    var arrayOfJson = JSON.parse(cellValToArrayStr).map(function(line) {
      return { _source: JSON.parse(line) }
    })
    var mockResponse = {
      response: { hits: { hits: arrayOfJson }}
    }
    var matchingTables = TableService_.findTablesIntersectingRange(range)
    var tableConfig = configOverride ? JSON.parse(configOverride) : {}
    if (!configOverride) {
      for (var tableName in matchingTables) {
        tableConfig = matchingTables[tableName]
        tableConfig = tableConfig.temp || tableConfig //(use temp if present)
        break
      }
    }
    var rowsCols = ElasticsearchResponseUtils_.buildRowColsFromDataResponse(
      tableName, tableConfig, {}, mockResponse, {}
    )
    // Convert to a 2d array
    var rows = []
    var headerConfig = TableRangeUtils_.getJson(tableConfig, [ "common", "headers" ]) || {}
    var filteredCols = ElasticsearchResponseUtils_.calculateFilteredCols(
      rowsCols.cols, headerConfig
    )
    var addedHeaders = headerConfig.position == "none"
    var headers = (function() {
      if (!addedHeaders) {
        rows.push([])
        return rows[0]
      } else return []
    }())
    rowsCols.rows.forEach(function(row) {
      var colArray = []
      filteredCols.forEach(function(colIndex) {
        var colObj = rowsCols.cols[colIndex]
        var colName = colObj.name
        if (!addedHeaders) {
          var colAlias = colObj.alias || colName
          headers.push(colAlias)
        }
        if (row.hasOwnProperty(colName)) {
          colArray.push(row[colName])
        } else {
           colArray.push("")
        }
      })
      addedHeaders = true
      rows.push(colArray)
    })
    return rows
  }

  /** Trigger for edit */
  function handleContentUpdates(range, triggerOverride) {
    //(copy paste from ElasticsearchManager.isTriggerEnabled_)
    var isTriggerEnabled = function(tableConfig, trigger) {
      var tableTrigger = tableConfig.trigger || "content_change"
      switch(trigger) {
        case "manual":
          return (tableTrigger != "disabled")
        case "config_change":
          return (tableTrigger != "disabled") && (tableTrigger != "manual")
        case "content_change":
          return (tableTrigger == "content_change")
        default:
          return true
      }
    }
    var trigger = triggerOverride || "content_change"
    var triggerPolicy = ManagementService_.getEsTriggerPolicy()
    if (!triggerOverride && ("timed_content" != triggerPolicy)) {
      return
    }
    var matchingTables = TableService_.findTablesIntersectingRange(range)
    Object.keys(matchingTables).forEach(function(matchingTableName) {
      var tableConfig = matchingTables[matchingTableName]
      tableConfig = tableConfig.temp ? tableConfig.temp : tableConfig
      if (isTriggerEnabled(tableConfig, trigger)) {
        markTableAsPending(matchingTableName)
        ManagementService_.setSavedObjectTrigger(
          matchingTableName, trigger
        )
      }
    })
  }

  ////////////////////////////////////////////////////////

  // Internal utils:

  /** Finds table lookups and returns them in an associative array */
  function findLookups_(tableConfig) {
    var tableConfigStr = JSON.stringify(tableConfig)
    var lookupMapRegex = /(['"])[$][$]lookupMap[(]['"]?(.*?)['"]?[)]\1/g
    var lookups = {}
    for (;;) {
      var lookup = lookupMapRegex.exec(tableConfigStr)
      if (!lookup) {
        break
      } else {
        var fullLookup = lookup[0]
        var lookupNameOrNotation = lookup[2]
        lookups[fullLookup] = lookupNameOrNotation
      }
    }
    return lookups
  }

  ////////////////////////////////////////////////////////

  return {
    configureElasticsearch: configureElasticsearch,

    markTableAsPending : markTableAsPending,
    getElasticsearchMetadata: getElasticsearchMetadata,
    buildAggregationQuery: buildAggregationQuery,

    handleSqlResponse: handleSqlResponse,
    handleCatResponse: handleCatResponse,
    handleAggregationResponse: handleAggregationResponse,
    handleDataResponse: handleDataResponse,

    summarizeEsSubTable: summarizeEsSubTable,
    buildEsSubTable: buildEsSubTable,
    handleContentUpdates: handleContentUpdates,

    TESTONLY: {
    }
  }
}())
