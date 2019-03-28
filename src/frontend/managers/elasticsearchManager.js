
var ElasticsearchManager = (function(){

  // Interface with UI

  /** Populate a data table from a query */
  function populateTable(tableName, tableConfig, testMode) {
     for (var key in tableToQueryMapping_) {
        var enabled = Util.getJson(tableConfig, [ key, "enabled" ]) || false
        if (enabled) {
           // Check that the common section doesn't include any incompatible visual elements
           var queryType = tableToQueryMapping_[key]
           if (!queryType.hasQueryBar) {
              Util.getOrPutJsonObj(tableConfig, [ "common", "query" ]).source = "none"
           }
           performGenericOperation(tableName, tableConfig, queryType.fn, testMode)
           break
        }
     }
  }

  /** Launches a SQL query to retrieve the fields of a table */
  function retrieveIndexPatternFields(indexPattern, callbackFn) {
    google.script.run.withSuccessHandler(function(obj) {
      try {
        var esMeta = obj.es_meta
        var esClient = ClientState_.getOrBuildClient(esMeta)

        //TODO write a non-SQL version
        var endpoint = "/_xpack/sql?format=json"
        var body = { "query": `DESCRIBE ${indexPattern}` }
        esClient.transport.request({
           method: "POST",
           path: endpoint,
           body: body,
           headers: esMeta.headers
        }, function(err, response, status) {
            if (!err) {
              callbackFn(response)
            }
        })
      } catch (err) {
        //(do nothing, fail harmlessly)
      }
    }).withFailureHandler(function(obj) {
       Util.showStatus("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
    }).getElasticsearchMetadata()
  }

  ////////////////////////////////////////////////////////

  // Internals

  var tableToQueryMapping_ = {
      "data_table": { fn: performDataQuery, hasQueryBar: true },
      "cat_table": { fn: performCatQuery, hasQueryBar: false },
      "sql_table": { fn: performSqlQuery, hasQueryBar: true },
      "aggregation_table": { fn: performAggregationQuery, hasQueryBar: true },
  }
  Object.freeze(tableToQueryMapping_)

  /** Keeps track of the different clients built so we don't keep rebuilding them (apart from sidebar reloads) */
  var ClientState_ = (function(){

     var clients = {}

     return {
       getOrBuildClient: function(esMeta) {
          var esMetaStr = JSON.stringify(esMeta)
          if (this.hasOwnProperty(esMetaStr)) {
             return this[esMetaStr]
          } else { // Build client
             var options = {
                host: esMeta.url
             }
             if (esMeta.auth_type == "password") {
                options.httpAuth = esMeta.username + ":" + esMeta.password
             }
             if (esMeta.version != "") { //(else default)
                options.version = esMeta.version
             }
             var client_options = esMeta.client_options_json || {}
             for (var key in client_options) {
                options[key] = client_options[key]
             }
             return new elasticsearch.Client(options)
          }
       }
     }
  }())

  /** Launches an ES client operation */
  function performGenericOperation(tableName, tableConfig, operationLogicFn, testMode) {
     google.script.run.withSuccessHandler(function(obj) {
        if (obj && (obj.es_meta.enabled || true)) { //(null used to return error which server has already handled)
           //TODO: all sorts of works still to be done on auth
           if (("password" == obj.es_meta.auth_type) && ("" == obj.es_meta.password)) {
              google.script.run.launchElasticsearchConfig()
           } else {
              operationLogicFn(tableName, tableConfig, obj, ClientState_.getOrBuildClient(obj.es_meta), testMode)
           }
        }
     }).withFailureHandler(function(obj) {
        Util.showStatus("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
     }).getElasticsearchMetadata(tableName, tableConfig, testMode)
  }

  /** Launches an aggregation query */
  function performAggregationQuery(tableName, tableConfig, esAndTableMeta, esClient, testMode) {
     var tableMeta = esAndTableMeta.table_meta
     // Incorporate lookups:
     var replacementMap = {
       "\"[$][$]field_filters\"": JSON.stringify(
         convertFieldFilterToSource_(
           Util.getJson(tableConfig, [ "common", "headers", "autocomplete_filters"]) || []
         )
       )
     }
     tableConfig = incorporateLookups_(tableConfig, tableMeta.lookups || {}, replacementMap)
     // Have an extra comms with the backend to build the query
     google.script.run.withSuccessHandler(function(obj) {

       var endpoint = (Util.getJson(tableConfig, [ "aggregation_table", "index_pattern" ]) || "*") + "/_search"

       //TODO: if can recognize certain simple case (single aggregation/composite/sort) then can do "proper" "fake" pagination

       if (testMode) {
          google.script.run.launchQueryViewer('View Aggregation: ' + tableName,
             'POST', endpoint, JSON.stringify(obj, null, 3)
          )
          return
       }
       esClient.transport.request({
          method: "POST",
          path: endpoint,
          body: obj,
          headers: esAndTableMeta.es_meta.headers
       }, function(err, response, status) {
          var result = handlePossibleError_(err, response, status, null, /*complexResponse*/true)
          google.script.run.handleAggregationResponse(tableName, tableConfig, esAndTableMeta, result, obj)
       })

     }).withFailureHandler(function(obj) {
        Util.showStatus("Failed to build aggregation query: [" + JSON.stringify(obj) + "]")
     }).buildAggregationQuery(tableConfig, tableMeta.query || "")
  }

  /** Launches an ES query */
  function performDataQuery(tableName, tableConfig, esAndTableMeta, esClient, testMode) {
     var tableMeta = esAndTableMeta.table_meta

     var userQuery = tableMeta.query || "*"
     var userQueryString = JSON.stringify(userQuery)
     userQueryString = userQueryString.substring(1, userQueryString.length - 1)

     var paginationSize = tableMeta.data_size || 100
     var page = tableMeta.page || 0
     var paginationFrom = tableMeta.page_info_offset ?
      page*paginationSize : 0

    // Incorporate lookups:
    var replacementMap = {
      "[$][$]query": userQueryString,
      "[$][$]pagination_from": paginationFrom,
      "[$][$]pagination_size": paginationSize,
      "\"[$][$]field_filters\"": JSON.stringify(
        convertFieldFilterToSource_(
          Util.getJson(tableConfig, [ "common", "headers", "field_filters"]) || []
        )
      )
    }
    tableConfig = incorporateLookups_(tableConfig, tableMeta.lookups || {}, replacementMap)

    var endpoint = (Util.getJson(tableConfig, [ "data_table", "index_pattern" ]) || "*") + "/_search"
    var body = Util.getJson(tableConfig, [ "data_table", "query" ]) || {}

    if (testMode) {
      google.script.run.launchQueryViewer('View ES query: ' + tableName,
        'POST', endpoint, JSON.stringify(body, null, 3)
      )
      return
    }

    esClient.transport.request({
      method: "POST",
      path: endpoint,
      body: JSON.stringify(body, null, 3),
      headers: esAndTableMeta.es_meta.headers
    }, function(err, response, status) {
      var result = handlePossibleError_(err, response, status, null, /*complexResponse*/true)
      google.script.run.handleDataResponse(tableName, tableConfig, esAndTableMeta, result, body)
    })
  }

  /** Launches a SQL query */
  function performSqlQuery(tableName, tableConfig, esAndTableMeta, esClient, testMode) {
     var tableMeta = esAndTableMeta.table_meta
     var userQuery = tableMeta.query || "True"
     var indices = Util.getJson(tableConfig, [ "sql_table", "index_pattern" ]) || ""
     var pagination = ""
     if (tableMeta.page_info_offset) {
        var rowsToPull = tableMeta.page*tableMeta.data_size + 1 // ES SQL currently doesn't support full pagination so have to grovel
        //(grab +1 so we know if there are more pages)
        pagination = "LIMIT " + rowsToPull
     }
     var fullSqlQuery = tableConfig.sql_table.query
        .replace(/[$][$]query/g, userQuery)
        .replace("$$pagination", pagination)
        .replace(/[$][$]index/g, indices)

     var endpoint = "/_xpack/sql?format=json"
     var body = { "query": fullSqlQuery }

     if (testMode) {
        google.script.run.launchQueryViewer('View SQL query: ' + tableName,
           'POST', endpoint, JSON.stringify(body, null, 3)
        )
        return
     }

     esClient.transport.request({
        method: "POST",
        path: endpoint,
        body: body,
        headers: esAndTableMeta.es_meta.headers
     }, function(err, response, status) {
        var result = handlePossibleError_(err, response, status, fullSqlQuery, /*complexResponse*/false)
        google.script.run.handleSqlResponse(tableName, tableConfig, esAndTableMeta, result, fullSqlQuery)
     })
  }

  /** Launches a _cat query */
  function performCatQuery(tableName, tableConfig, esAndTableMeta, esClient, testMode) {

     var endpoint = Util.getJson(tableConfig , [ "cat_table", "endpoint" ]) || ""
     var options = (Util.getJson(tableConfig , [ "cat_table", "options" ]) || [])
     options = options.filter(function(o) { return o.trim().indexOf('#') != 0 })
     var catQuery = `/_cat/${endpoint}?format=json` + (options.length > 0 ? '&' : '') + options.join("&")

     if (testMode) {
        google.script.run.launchQueryViewer('View _cat query: ' + tableName,
           'GET', catQuery, ""
        )
        return
     }

     esClient.transport.request({
        method: "GET",
        path: catQuery,
        headers: esAndTableMeta.es_meta.headers
     }, function(err, response, status) {
        var result = handlePossibleError_(err, response, status, catQuery, /*complexResponse*/false)
        google.script.run.handleCatResponse(tableName, tableConfig, esAndTableMeta, result, catQuery)
     })
  }

  ////////////////////////////////////////////////////////

  /** Common formatting for errors */
  function handlePossibleError_(err, response, status, queryString, complexResponse) {
    var result = {}
    if (err) {
      if (complexResponse && response.error) {
        result.error_message = err.message
        result.error_object = response.error
      } else {
        result.error_message = err.message
        result.query_string = queryString
      }
    } else {
      result.response = response
    }
    if (status) { result.status = status || "unknown" }
    return result
  }

  /** util function to escape rege - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions */
  function escapeRegExp_(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Find/replace lookups */
  function incorporateLookups_(tableConfig, lookups, otherReplacements) {
    var tableConfigStr = JSON.stringify(tableConfig)
    Object.entries(lookups).forEach(function(kv) {
      var lookupStr = kv[0]
      var lookupRegex = new RegExp(escapeRegExp_(lookupStr), "g")
      var lookupJsonStr = JSON.stringify(kv[1])
      tableConfigStr = tableConfigStr.replace(lookupRegex, lookupJsonStr)
    })
    if (otherReplacements) {
      Object.entries(otherReplacements).forEach(function(kv) {
        tableConfigStr = tableConfigStr.replace(new RegExp(kv[0], "g"), kv[1])
      })
    }
    return JSON.parse(tableConfigStr)
  }

  /** Converts the field filter into a reduction */
  function convertFieldFilterToSource_(fieldFilters) {
    var retVal = {
      includes: [],
      excludes: []
    }
    //(see also ElasticsearchUtils_ and AutocompletionManager .buildFilterFieldRegex_)
    var tidiedUp = fieldFilters
      .map(function(el) { return el.trim() })
      .filter(function(el) { return el && ('#' != el[0]) })
      .map(function(el) {
        return el //handle built-in substitutions
          .replace(
            "-$$beats_fields", "-host, -beat, -input, -prospector, -source, -offset, -@timestamp"
          ).replace( //(also works for +$$beats_fields)
            "$$beats_fields", "host, beat, input, prospector, source, offset, @timestamp"
          ).replace(
            "-$$docmeta_fields", "-_id, -_index, -_score, -_type"
          ).replace( //(also works for +$$docmeta_fields)
            "$$docmeta_fields", "_id, _index, _score, _type"
          )
      }).flatMap(function(elArrayStr) {
        return (elArrayStr.indexOf("/") >= 0)
          ? [ elArrayStr ] //(1 regex per line)
          : elArrayStr.split(",")
      }).map(function(el) { return el.trim() })
      .filter(function(el) { return el && ('+' != el) && ('-' != el) })
      .filter(function(el) { return el })
      .map(function(el) {
        var firstEl = ('-' == el[0]) ? '-' : '+'
        if (('+' == el[0]) || ('-' == el[0])) {
          el = el.substring(1)
        }
        return firstEl + el
      })
    // OK so here's the plan:
    // 1) grab the first block of negative matches (ignoring regexes)
    // 2) grab following positive matches, treating a regex as *
    //    (and ignoring all negative matches)
    for (var ii = 0; ii < tidiedUp.length; ++ii) {
      var filter = tidiedUp[ii]
      if ('-' == filter[0]) {
        if (filter.indexOf("/") < 0) { //not a regex
          retVal.excludes.push(filter.substring(1))
        }
      } else break
    }
    for (; ii < tidiedUp.length; ++ii) {
      var filter = tidiedUp[ii]
      if ('+' == filter[0]) {
        if (filter.indexOf("/") < 0) { //not a regex
          retVal.includes.push(filter.substring(1))
        } else {
          retVal.includes = [] //(have to allow all)
          break
        }
      }
    }
    return retVal
  }

  ////////////////////////////////////////////////////////

  return {
    populateTable: populateTable,
    retrieveIndexPatternFields: retrieveIndexPatternFields,

    TESTONLY: {
      convertFieldFilterToSource_: convertFieldFilterToSource_
    }
  }

}())
