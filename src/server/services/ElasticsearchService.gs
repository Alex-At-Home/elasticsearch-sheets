/**
 * Handles service-level calls as part of  the integration between the client application and the ES configuration
 */

//TODO sub-table viewer and javadocs for 2 UDFs

 //TODO: would be nice to have a "easy_composite" element that takes the next N terms and adds them to a composite

//TODO: saving password does weird redirect thing

//TODO (add move range copy/paste)

//TODO: get add-on menu working

//TODO: Longer term:

//TODO: handleRowColResponse _badly_ needs some unit tests :(

//TODO: offload more processing into browser via shared files

//TODO: once the mapping is pulled from non-SQL, can use it to create cols without needing ~2 passes over the data

//TODO: would be nice to have a data summary table, 1 row per field with stats

//TODO: allow specification of data type per col (including JSON, prettyJSON)

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
         tableConfig.range = "A1:Z200"
         range = range.getSheet().getRange("A1:Z200")
       } else if (range.getA1Notation().match(/[0-9]+:[0-9]+/)) {
         range = range.getSheet().getRange(1, 1, range.getNumRows(), 26)
         tableConfig.range = range.getA1Notation()
       } else if (range.getA1Notation().match(/[a-z]+:[a-z]+/i)) {
         range = range.getSheet().getRange(1, 1, 200, range.getNumColumns())
         tableConfig.range = range.getA1Notation()
       }
     }

     if (!TableRangeUtils_.validateNewRange(ss, tableConfig)) {
       return null
     }

     // Build table outline and add pending

     var statusInfo = "PENDING [" + new Date().toString() + "]"
     var tableMeta = ElasticsearchUtils_.buildTableOutline(tableName, tableConfig, range, statusInfo, testMode)

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
     /* Here's the model:
        {
           "name": "string", //(also used as the header - ignore any element with no name)
           "agg_type": "string", //"__map_reduce__" or any ES aggregation, ignore any element with no agg_type
           "location": "string" // "automatic" (all the buckets follow each other, all the metrics/pipelines at the bottom), "
                                // disabled" (ignore), or under a specified "name"
           "field_filter": "string" // (not used in the query building, controls the display)
           "config": { .. } // the aggregation config
     */

     // (Stores elements with a custom position)
     var elsByCustomPosition = {}
     // (All the elements by name so we can add to them if they have custom position)
     var elementsByName = {}
     var aggList = []

     var getOrPutJsonField = function(json, field) {
       return json[field] || (json[field] = {})
     }

     var aggTable = TableRangeUtils_.getJson(config || {}, [ "aggregation_table" ]) || {}

     var queryString = JSON.stringify(aggTable.query || { "query": { "match_all": {} } })
     var jsonEscapedStr = function(str) {
        var escapedInQuotes = JSON.stringify(str)
        return escapedInQuotes.substring(1, escapedInQuotes.length - 1)
     }
     queryString = queryString.replace("$$query", jsonEscapedStr(querySubstitution || "*"))
     var postBody = JSON.parse(queryString)
     postBody.size = 0 //(never have any interest in returning docs)
     var aggregationsLocation = getOrPutJsonField(postBody, 'aggregations')

     var insertElementsFrom = function(listName, nestEveryTime, noDupCheck) {
        var configArray = aggTable[listName] || []
        configArray
           .filter(function(el) {
              return el.name && el.agg_type && ("disabled" || el.location)
           })
           .forEach(function(el) {
              // (do some quick validation)
              if ('buckets' == el) {
                 throw new Exception("Not allowed to call any of the table elements [buckets]")
              } else if (noDupCheck.hasOwnProperty(el)) {
                throw new Exception("Duplicate table element [" + el + "]")
              }

              var configEl = transformConfig_(config, el)
              elementsByName[el.name] = configEl
              if (!el.location || ("automatic" == el.location)) {
                 aggregationsLocation[el.name] = configEl
                 if (nestEveryTime) {
                    aggregationsLocation = getOrPutJsonField(configEl, 'aggregations')
                 }
              } else { // (we'll stash it and sort it out later)
                 var storedEl = {}
                 storedEl[el.name] = configEl
                 var currArray = elsByCustomPosition[el.location] || []
                 if (0 == currArray.length) {
                    elsByCustomPosition[el.location] = currArray
                 }
                 currArray.push(storedEl)
              }
           })
     }
     //(state aggregationsLocation preserved between these calls)
     var noDupCheck = {}
     insertElementsFrom('buckets', true, noDupCheck)
     insertElementsFrom('metrics', false, noDupCheck)
     insertElementsFrom('pipelines', false, noDupCheck)

     // Now inject any elements with a custom position
     for (var k in elsByCustomPosition) {
       var insertInto = elementsByName[k] || {}
       aggregationsLocation = getOrPutJsonField(insertInto, 'aggregations')
       var toInsertArray = elsByCustomPosition[k] || []
       toInsertArray.forEach(function(el) {
           Object.keys(el).forEach(function(name) {
              aggregationsLocation[name] = el[name]
           })
       })
     }
     return postBody
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
     ElasticsearchUtils_.handleRowColResponse(tableName, tableConfig, context, json, rows, cols, /*supportsSize*/false)
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
     ElasticsearchUtils_.handleRowColResponse(tableName, tableConfig, context, json, rows, cols, /*supportsSize*/true)
  }

  /** Populates the data table range with the given aggregation response (context comes from "getElasticsearchMetadata") */
  function handleAggregationResponse(tableName, tableConfig, context, json, aggQueryJson) {
    var rowsCols = { rows: [], cols: [] }
    try {
       if (null != json.response) {
          rowsCols = ElasticsearchUtils_.buildRowColsFromAggregationResponse(
            tableName, tableConfig, context, json, aggQueryJson
          )
      }
    } catch (err) {
      json.response = null
      json.error_message = err.message
      json.query_string = JSON.stringify(aggQueryJson)
    }
    ElasticsearchUtils_.handleRowColResponse(tableName, tableConfig, context, json, rowsCols.rows, rowsCols.cols, /*supportsSize*/true)
  }

  /** Populates the data table range with the given query response (context comes from "getElasticsearchMetadata") */
  function handleDataResponse(tableName, tableConfig, context, json, queryJson) {
    var rowsCols = { rows: [], cols: [] }
    var numHits = 0
    try {
       if (null != json.response) {
          numHits =  TableRangeUtils_.getJson(json.response || {}, [ "hits", "total" ]) || 0
          rowsCols = ElasticsearchUtils_.buildRowColsFromDataResponse(
            tableName, tableConfig, context, json, queryJson
          )
      }
    } catch (err) {
      json.response = null
      json.error_message = err.message
      json.query_string = JSON.stringify(queryJson)
    }
    ElasticsearchUtils_.handleRowColResponse(
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

  ////////////////////////////////////////////////////////

  // Internal utils:

  /** Converts the __map_reduce__ custom type into a scripted_metric, otherwise just embeds into its own object */
  function transformConfig_(globalConfig, configEl) {
    var retVal = {}
    if ("__map_reduce__" == configEl.agg_type) {
       var aggTable = globalConfig.aggregation_table || {}
       var mapReduce = aggTable.map_reduce || {}
       var lib = (mapReduce.lib || "") + "\n\n"
       // Combine the 2 params
       var combinedParams = configEl.config || {}
       combinedParams['_name_'] = configEl.name //(can use the same script boxes for different jobs)
       var params = mapReduce.params || {}
       for (var k in params) {
          combinedParams[k] = params[k]
       }
       retVal.scripted_metric = {
          params: combinedParams,
          init_script: lib + (mapReduce.init || ""),
          map_script: lib + (mapReduce.map || ""),
          combine_script: lib + (mapReduce.combine || ""),
          reduce_script: lib + (mapReduce.reduce || "")
       }
    } else {
       retVal[configEl.agg_type] = configEl.config || {}
    }
    return retVal
  }

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

    getElasticsearchMetadata: getElasticsearchMetadata,
    buildAggregationQuery: buildAggregationQuery,

    handleSqlResponse: handleSqlResponse,
    handleCatResponse: handleCatResponse,
    handleAggregationResponse: handleAggregationResponse,
    handleDataResponse: handleDataResponse,

    summarizeEsSubTable: summarizeEsSubTable,

    TESTONLY: {
    }
  }
}())
