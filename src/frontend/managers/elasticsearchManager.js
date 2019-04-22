
var ElasticsearchManager = (function(){

  // Interface with UI

  /** Populate a data table from a query */
  function populateTable(tableName, tableConfig, trigger, testMode) {
    if (!testMode) { //(always allow test mode)
        if (!isTriggerEnabled_(tableConfig, trigger)) {
            // If it's manual then warn:
            if ("manual" == trigger) {
              Util.showStatus("This table is disabled", "Warning")
            }
            return
        }
    }
     for (var key in tableToQueryMapping_) {
        var enabled = Util.getJson(tableConfig, [ key, "enabled" ]) || false
        if (enabled) {
           // Check that the common section doesn't include any incompatible visual elements
           var queryType = tableToQueryMapping_[key]
           if (!queryType.hasQueryBar) {
              Util.getOrPutJsonObj(tableConfig, [ "common", "query" ]).source = "none"
           }
           performGenericOperation(tableName, tableConfig, queryType.fn, trigger, testMode)
           break
        }
     }
  }

  /** Launches a SQL query to retrieve the fields of a table - old VERSION */
  function retrieveIndexPatternFields(indexPattern, callbackFn) {
    google.script.run.withSuccessHandler(function(obj) {
      try {
        var esMeta = obj.es_meta
        var esClient = ClientState_.getOrBuildClient(esMeta)

        //TODO write a non-SQL version
        var endpoint = `${indexPattern}/_mapping`
        esClient.transport.request({
           method: "GET",
           path: endpoint,
           headers: esMeta.headers
        }, function(err, response, status) {
            if (!err) {
              callbackFn(ElasticsearchUtil.getMappingList(response))
            } else {
              console.log("Error retrieving index mapping: " + JSON.stringify(err))
            }
        })
      } catch (err) {
        console.log("Error retrieving index mapping: " + err.message)
      }
    }).withFailureHandler(function(obj) {
       console.log("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
    }).getElasticsearchMetadata()
  }

  /** Get the list of indices, together with metadata:
   ** { health, status, index, uuid, pri, rep, docs.count, docs.deleted, store.size, pri.store.size }
   */
  function retrieveIndices(callbackFn) {
    google.script.run.withSuccessHandler(function(obj) {
      try {
        var esMeta = obj.es_meta
        var esClient = ClientState_.getOrBuildClient(esMeta)

        //TODO write a non-SQL version
        var endpoint = `_cat/indices?format=json&s=index`
        esClient.transport.request({
           method: "GET",
           path: endpoint,
           headers: esMeta.headers
        }, function(err, response, status) {
            if (!err) {
              callbackFn(response)
            } else {
              console.log("Error retrieving index list: " + JSON.stringify(err))
            }
        })
      } catch (err) {
        console.log("Error retrieving index list: " + err.message)
      }
    }).withFailureHandler(function(obj) {
       console.log("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
    }).getElasticsearchMetadata()
  }

  /** Util method to check if ES is configured to make requests */
  function getEsReadiness(esMeta, onReadyCallback, onNotReadyCallback) {
    var esEnabled = esMeta.hasOwnProperty("enabled") ? esMeta.enabled : true
    esMeta.enabled = esEnabled //(ensure always present)
    var esConfigured = esMeta.url ? true : false
    var esUnauthorized = esEnabled &&
      (("password" == esMeta.auth_type) && ("" == esMeta.password))

    if (esEnabled && esConfigured && !esUnauthorized) {
      onReadyCallback(esMeta)
    } else {
      onNotReadyCallback(esMeta)
    }
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
  function performGenericOperation(tableName, tableConfig, operationLogicFn, trigger, testMode) {
     var onReady = function(obj) {
       operationLogicFn(tableName, tableConfig, obj, ClientState_.getOrBuildClient(obj.es_meta), testMode)
     }
     google.script.run.withSuccessHandler(function(obj) {
       if (obj) getEsReadiness(obj.es_meta || {},
         function(esMeta) { // ready
           onReady(obj)
         },
         function(esMeta) { // not ready
           if (testMode) { // this is fine, carry on
             onReady(obj)
           } else {
             if ("manual" == trigger) {
               if (esMeta.enabled) { //(password or URL missing)
                 google.script.run.launchElasticsearchConfig()
               } else {
                 Util.showStatus("This table's ES connection is disabled")
               }
             } else {
               delete esMeta.password //(eg if URL removed but password present)
               //(will only happen if user unsets authentication after launching table builder)
               console.log("Authorization not configured for ES: [" + JSON.stringify(esMeta) + "]")
             }
           }
         }
       ) //(if obj is null, there's been a server-side error which has already been reported)
     }).withFailureHandler(function(obj) {
       if ("manual" == trigger) { //TODO: move this into Util.showStatus
         Util.showStatus("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
       } else { //(just log to avoid annoying pop-up all the time)
         console.log("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
       }
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
     tableConfig = incorporateLookupsAndScriptFields_(
       "aggregation_table", tableConfig, tableMeta.lookups || {}, replacementMap
     )
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
     var page = tableMeta.page || 1
     var paginationFrom = tableMeta.page_info_offset ?
      (page - 1)*paginationSize : 0

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
    tableConfig = incorporateLookupsAndScriptFields_(
      "data_table", tableConfig, tableMeta.lookups || {}, replacementMap
    )

    var endpoint = (Util.getJson(tableConfig, [ "data_table", "index_pattern" ]) || "*") + "/_search"
    var rawQuery = Util.getJson(tableConfig, [ "data_table", "query" ]) || {}
    var body = getQueryIncludingScriptFields_("data_table", rawQuery, tableConfig)

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
     var page = tableMeta.page || 1
     if (tableMeta.page_info_offset) {
        var rowsToPull = page*tableMeta.data_size + 1 // ES SQL currently doesn't support full pagination so have to grovel
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
       if (!endpoint) {
         Util.showState("_cat must have endpoint", "Client error")
       } else {
          google.script.run.launchQueryViewer('View _cat query: ' + tableName,
             'GET', catQuery, ""
          )
          return
       }
     }
     if (!endpoint) { // Simulate a 400 error from the server
       var result = handlePossibleError_(
         { message: "_cat must have endpoint" }, {}, -400, catQuery, false
       )
       google.script.run.handleCatResponse(tableName, tableConfig, esAndTableMeta, result, catQuery)
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
      if (complexResponse && response && response.error) {
        result.error_message = err.message
        result.error_object = response.error
      } else {
        result.error_message = err.message || JSON.stringify(err)
        result.query_string = queryString || ""
      }
    } else {
      result.response = response
    }
    result.status = status || "unknown"
    return result
  }

  /** util function to escape rege - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions */
  function escapeRegExp_(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Find/replace lookups */
  function incorporateLookupsAndScriptFields_(path, tableConfig, lookups, otherReplacements) {
    var tableConfigStr = JSON.stringify(tableConfig)
    Object.entries(lookups).forEach(function(kv) {
      var lookupStr = kv[0]
      var lookupRegex = new RegExp(escapeRegExp_(lookupStr), "g")
      var lookupJsonStr = JSON.stringify(kv[1])
      tableConfigStr = tableConfigStr.replace(lookupRegex, lookupJsonStr)
    })
    var scriptFields = Util.getJson(tableConfig, [ path, "script_fields" ]) || []
    scriptFields.forEach(function(scriptField) {
      var lookupStr = `"$$script_field(${scriptField.name})"`
      var lookupRegex = new RegExp(escapeRegExp_(lookupStr), "g")
      var lookupJsonStr = JSON.stringify({
        lang: "painless",
        source: scriptField.script || "",
        params: scriptField.params || {}
      })
      tableConfigStr = tableConfigStr.replace(lookupRegex, lookupJsonStr)
    })
    if (otherReplacements) {
      Object.entries(otherReplacements).forEach(function(kv) {
        tableConfigStr = tableConfigStr.replace(new RegExp(kv[0], "g"), kv[1])
      })
    }
    return JSON.parse(tableConfigStr)
  }

  /** Incorporates script fields into a query */
  function getQueryIncludingScriptFields_(path, query, tableConfig) {
    var userScriptFields = Util.getJson(tableConfig, [ path, "script_fields" ]) || []
    if (userScriptFields) {
      var currentScriptFields = query.script_fields || {}
      userScriptFields.forEach(function(scriptField) {
        currentScriptFields[scriptField.name] = {
          script: {
            lang: "painless",
            source: scriptField.script || "",
            params: scriptField.params || {}
          }
        }
      })
      query.script_fields = currentScriptFields
    }
    return query
  }

  /** Converts the field filter into a reduction */
  function convertFieldFilterToSource_(fieldFilters) {
    var retVal = {
      includes: [],
      excludes: []
    }
    //(see also ElasticsearchResponseUtils_ and AutocompletionManager .buildFilterFieldRegex_)
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

  /** Checks whether a requested re-populate is desired */
  function isTriggerEnabled_(tableConfig, trigger) {
    //(copy paste from ElasticsearchService.handleContentUpdates.isTriggerEnabled)
    var tableTrigger = tableConfig.trigger || "control_change"
    switch(trigger) {
      case "manual":
        return (tableTrigger != "disabled")
      case "config_change":
        return (tableTrigger != "disabled") && (tableTrigger != "manual")
      case "control_change":
        return (tableTrigger == "control_change") || (tableTrigger == "content_change")
      case "content_change":
        return (tableTrigger == "content_change")
      default:
        return true
    }
  }

  ////////////////////////////////////////////////////////

  return {
    populateTable: populateTable,
    retrieveIndexPatternFields: retrieveIndexPatternFields,
    retrieveIndices: retrieveIndices,

    getEsReadiness: getEsReadiness,

    TESTONLY: {
      convertFieldFilterToSource_: convertFieldFilterToSource_,
      isTriggerEnabled_: isTriggerEnabled_
    }
  }

}())
