var AutocompletionManager = (function() {

  // 1] SQL

  // https://www.elastic.co/guide/en/elasticsearch/reference/6.6/sql-commands.html
  var sqlMainKeywords_ = [
    "DESCRIBE TABLE", "LIKE",
    "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "ASC", "DESC", "LIMIT",
    "SHOW COLUMNS", "SHOW FUNCTIONS", "SHOW TABLES", "IN"
  ].map(function(el) { return { caption: el, value: el, meta: "command keyword"} })
  var sqlAuxKeywords_ = [
    "ALL", "AND", "ANY", "AS", "BETWEEN", "BY", "DISTINCT",
    "EXISTS", "EXPLAIN", "EXTRACT", "FALSE", "FUNCTIONS", "FROM", "FULL",
    "INNER", "IS", "JOIN", "LEFT", "MATCH", "NATURAL", "NO", "NOT",
    "NULL", "ON", "OR", "OUTER", "RIGHT", "SESSION", "TABLE", "THEN", "TO",
    "TABLE", "TABLES", "TRUE", "USING", "WHEN", "WHERE", "WITH"
  ].map(function(el) { return { caption: el, value: el, meta: "reserved keyword"} })

  var sqlFunctionsAggregate_ = [
    "AVG", "COUNT", "MAX", "MIN", "SUM", "KURTOSIS", "PERCENTILE",
    "PERCENTILE_RANK", "SKEWNESS", "STDDEV_POP", "SUM_OF_SQUARES",
    "VAR_POP",
  ].map(function(el) { return { caption: el, snippet: el + "(", meta: "function (aggregate)"} })

  var sqlFunctionsGrouping_ = [
    "HISTOGRAM"
  ].map(function(el) { return { caption: el, snippet: el + "(", meta: "function (grouping)"} })

  var sqlFunctionsConditional_ = [
    "COALESCE", "GREATEST", "IFNULL", "ISNULL", "LEAST", "NULLIF", "NVL"
  ].map(function(el) { return { caption: el, snippet: el + "(", meta: "function (conditional)"} })

  var sqlFunctionsScalar_ = [
    "CURRENT_TIMESTAMP", "DAY", "DAYNAME", "DAYOFMONTH", "DAYOFWEEK",
    "DAYOFYEAR", "DAY_NAME", "DAY_OF_MONTH", "DAY_OF_YEAR", "DOM", "DOW",
    "DOY", "HOUR", "HOUR_OF_DAY", "IDOW", "ISODAYOFWEEK", "ISODOW", "ISOWEEK",
    "ISOWEEKOFYEAR", "ISO_DAY_OF_WEEK", "ISO_WEEK_OF_YEAR", "IW", "IWOY",
    "MINUTE", "MINUTE_OF_DAY", "MINUTE_OF_HOUR", "MONTH", "MONTHNAME", "MONTH_NAME",
    "MONTH_OF_YEAR", "NOW", "QUARTER", "SECOND", "SECOND_OF_MINUTE", "WEEK",
    "WEEK_OF_YEAR", "YEAR",
    "ABS", "ACOS", "ASIN", "ATAN", "ATAN2", "CBRT", "CEIL", "CEILING", "COS",
    "COSH", "COT", "DEGREES", "E", "EXP", "EXPM1", "FLOOR", "LOG", "LOG10", "MOD",
    "PI", "POWER", "RADIANS", "RAND", "RANDOM", "ROUND", "SIGN", "SIGNUM", "SIN",
    "SINH", "SQRT", "TAN", "TRUNCATE", "ASCII", "BIT_LENGTH", "CHAR", "CHARACTER_LENGTH",
    "CHAR_LENGTH", "CONCAT", "INSERT", "LCASE", "LEFT", "LENGTH", "LOCATE", "LTRIM",
    "OCTET_LENGTH", "POSITION", "REPEAT", "RIGHT", "RTRIM", "SPACE", "SUBSTRING",
    "UCASE", "CAST", "CONVERT", "DATABASE", "USER", "SCORE"
  ].map(function(el) { return { caption: el, snippet: el + "(", meta: "function (scalar)"} })

  var sqlSubVariables_ = [
    "$$query", "$$index", "$$pagination"
  ].map(function(el) { return { caption: el, value: el, meta: "substitution variable"} })

  var allSql_ = [].concat(sqlMainKeywords_).concat(sqlAuxKeywords_)
    .concat(sqlFunctionsAggregate_)
    .concat(sqlFunctionsGrouping_)
    .concat(sqlFunctionsConditional_)
    .concat(sqlFunctionsScalar_)
    .concat(sqlSubVariables_)

  //TODO: output params (look for " as <name>" in SQL)

  /** ACE code editor completion handler for SQL tables */
  var sqlCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, allSql_)
    }
  }

  // 2] ES Queries

  var querySubVariables_ = [
    "$$query", "$$pagination_from", "$$pagination_size", "$$field_filters"
  ].map(function(el) { return { caption: el, value: el, meta: "substitution variable"} })

  var queryParameters_ = TopLevelQueryParameters.map(function(param) {
    return { caption: param, value: param, meta: "top-level query parameters" }
  })


  var queryParameterValues_ = TopLevelQueryParameterValues.map(function(paramValue) {
    return { caption: paramValue, value: paramValue, meta: "top-level query parameter values" }
  })

  var dateFormats_ = [
    "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd", "epoch_millis", "dd/MM/yyyy||yyyy"
  ].map(function(el) { return { caption: el, value: el, meta: "sample date format", score: -20.0 } })

  var queryKeywords_ = QueryKeywords.map(function(keyword) {
    return { caption: keyword, value: keyword, meta: "query keyword", score: -40.0 }
  })

  var allQuery_ = [].concat(querySubVariables_)
    .concat(queryParameters_)
    .concat(queryParameterValues_)
    .concat(dateFormats_)
    .concat(queryKeywords_)

  /** ACE code editor completion handler for params */
  var queryCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, allQuery_)
    }
  }

  // Subtituing snippets is a bit more involved because of leading/trailing "s:

  var querySubInsertMatch = function(editor, data) {
    var snippetManager = ace.require("ace/snippets").snippetManager

    // (Don't have access to ace generated prefix, but this is fine since we know we haven't changed the id regex)
    editor.removeWordLeft()

    // Now remove leading/trailing ""s if they exist
    var pos = editor.getCursorPosition()
    var line = editor.session.getLine(pos.row)
    var startColToRemove = ((pos.column > 0) && (line[pos.column - 1] == "\"")) ? 1 :  0
    var endColToRemove = ((pos.column < line.length) && (line[pos.column] == "\"")) ? 1 : 0

    var ranges = editor.selection.getAllRanges()
    for (var i = 0, range; range = ranges[i]; i++) {
      range.start.column -= startColToRemove
      range.end.column += endColToRemove
      editor.session.remove(range)
    }

    // Use the existing snippet logic:
    snippetManager.insertSnippet(editor, data.snippet)
  }

  var querySubstitutions_ = Object.keys(QueryInfo).flatMap(function(queryMeta){
    var queries = QueryInfo[queryMeta]
    return Object.keys(queries).map(function(queryName) {
      var querySubJsonStr = `"${queryName}": ${JSON.stringify(queries[queryName], null, 3)}`
      return {
        caption: queryName, snippet: querySubJsonStr, meta: queryMeta, score: -10.0,
        completer: { insertMatch: querySubInsertMatch }
      }
    })
  })

  var queryInsertionCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, querySubstitutions_)
    }
  }

  // Parameters (query + also MR params)

  var paramsHelp_ = [
    "$$lookupMap(NAMED_RANGE_OR_A1_NOTATION)"
  ].map(function(el) { return { caption: el, value: el, meta: "parameter substitution" } })

  /** ACE code editor completion handler for params */
  var paramsCompleter = {
    //TODO: get list of candidate named ranges
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, paramsHelp_)
    }
  }

  // 3] Painless

  var painlessApiRegex_ = /.*[\/]([^#\/]*)[.]html#(?:[^.-]*[.])*(.*)/
  var paramTidierRegex_ = /([a-z_]*[.])/g
  var painlessApi_ = PainlessApi.flatMap(function(urlEncoded) {
    var url = decodeURIComponent(urlEncoded)
    var matches = painlessApiRegex_.exec(url)
    if (matches) {
      var parentClass = matches[1]
      var methodAndParams = matches[2].split("-")
      var methodName = methodAndParams.shift()
      var params = methodAndParams.filter(function(el) {
        return el.length > 0
      }).map(function(param) {
        return param.replace(paramTidierRegex_, "").replace("Object", "def")
      }).join(",")

      var method = `${methodName}(${params}`
      var staticMethod = parentClass + "." + method
      var meta = `method (${parentClass})`
      var staticMeta = "method"
      return [ // return static and non-static, since we're not sure which is which
        { caption: method, snippet: method, meta: meta, score: -100 },
        { caption: staticMethod, snippet: staticMethod, meta: staticMeta, score: -100 },
      ]
    } else {
      return []
    }
  })

  var painlessContext_ = [
    "params",
    "params._name_",
    "params._source",
    "_score",
    "state",
    "states",
    "doc"
  ].map(function(el) {
    return { caption: el, value: el, meta: "context variable" }
  })
  //TODO: all keys from user specified param

  var painlessKeywords_ = [
    "if", "else", "while", "do", "for",
    "in", "continue", "break", "return", "new",
    "try", "catch", "throw", "this", "instanceof",

    "byte", "short", "char", "int", "long", "float", "double",
    "boolean", "def", "Object", "String", "void"
  ].map(function(el) {
    return { caption: el, value: el, meta: "painless keyword", score: -50 }
  })

  var allPainless_ = painlessApi_.concat(painlessContext_).concat(painlessKeywords_)

  /** Language completer for painless */
  var painlessCompleter = function(editorId) { return {
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, allPainless_)
    }
  }}

  // 4] Aggregations

  //TODO: output params (ie bucket names)

  // 5] Dyanmic data from ES

  var idToIndexPatternLookup_ = {}
  var indexPatternToFields_ = {}
  var indexIdToFields_ = {}
  var fieldFilters_ = {}
  var editorIdToIndexId_ = {}

  //TODO: tidy up resources when possible

  /** Internal util to apply the filter to the set of fields */
  function setFilteredFields_(indexPatternId, unfilteredFields, editorId) {
    var filteredRetVal = {}
    Object.keys(unfilteredFields).forEach(function(key) {
      filteredRetVal[key] = unfilteredFields[key].filter(function(el) {
        return isFieldWanted_(el.filter_info, fieldFilters_[editorId] || [])
      })
      filteredRetVal["all_" + key] = [].concat(unfilteredFields[key])
    })
    indexIdToFields_[indexPatternId] = filteredRetVal
  }

  /** Register a list of filters against the auto-completers */
  function registerFilterList(editorId, fieldFilters) {
    fieldFilters_[editorId] = buildFilterFieldRegex_(fieldFilters)
    var indexIdSet = editorIdToIndexId_[editorId] || {}
    // Re-apply filters

    var indexPatternsDoneSet = { "": true }
    Object.keys(indexIdSet).forEach(function(indexPatternId) {
      var indexPattern = idToIndexPatternLookup_[indexPatternId] || ""
      if (!indexPatternsDoneSet.hasOwnProperty(indexPattern)) {
        indexPatternsDoneSet[indexPattern] = true
        var unfilteredFields = indexPatternToFields_[indexPattern] || {}
        setFilteredFields_(indexPatternId, unfilteredFields, editorId)
      }
    })
  }

  /** Any time the index pattern might have changed, refill it with data */
  function registerIndexPattern(indexPatternId, editorId) {
    //(link the index pattern id and the editor id)
    var indexIdSet = editorIdToIndexId_[editorId] || {}
    indexIdSet[indexPatternId] = true
    editorIdToIndexId_[editorId] = indexIdSet

    var prevIndexPatternVal =
      idToIndexPatternLookup_.hasOwnProperty(indexPatternId) ?
      idToIndexPatternLookup_[indexPatternId] : ""

    var currIndexPatternVal = $(`#${indexPatternId}`).val()

    if (prevIndexPatternVal != currIndexPatternVal) {
      idToIndexPatternLookup_[indexPatternId] = currIndexPatternVal
    }

    if (!currIndexPatternVal) { //no index
        delete indexIdToFields_[indexPatternId]
    } else {
      //TODO: don't actually need to do all this every time, can have
      //some sort of cache
      ElasticsearchManager.retrieveIndexPatternFields(
        currIndexPatternVal, function(response) {
          var retVal = {} //painless: [], raw: []
          var rows = response.rows || []
          retVal.raw = rows.map(function(row) {
            return {
              caption: row[0], value: row[0], meta: `data field (${row[2]})`, filter_info: row[0]
            }
          })
          retVal.painless = retVal.raw.concat(rows.map(function(row) {
            var docField = `doc["${row[0]}"].value`
            return {
              caption: docField, value: docField, meta: `document field (${row[2]})`, filter_info: row[0]
            }
          }))
          indexPatternToFields_[currIndexPatternVal] = retVal
          setFilteredFields_(indexPatternId, retVal, editorId)
        }
      )
    }
  }

  /** ACE code editor completion handler for almost all tables */
  var dataFieldCompleter = function(indexPatternId, dataFieldType) { return {
    getCompletions: function(editor, session, pos, prefix, callback) {
      var fieldsObj = indexIdToFields_[indexPatternId] || {}
      var wordList = fieldsObj.hasOwnProperty(dataFieldType) ? fieldsObj[dataFieldType] : []
      callback(null,  wordList)
    }
  }}

  //TODO index pattern completer?

  var commonDocFieldFilters_ = [
    "$$beats_fields",
    "-$$beats_fields",
    "$$docmeta_fields",
    "-$$docmeta_fields",
  ].map(function(el) {
    return { caption: el, value: el, meta: "useful field filter composites" }
  })

  /** ACE code editor completion handler for almost all tables */
  var filterFieldGroupCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null,  commonDocFieldFilters_)
    }
  }

  ////////////////////////////////////////////////////

  // Some internal utils, duplicated from ElasticsearchUtils.gs

  function isFieldWanted_(field, filterFieldArray) {
    var negativeOnly = true
    if (0 == filterFieldArray.length) {
       return true
    }
    for (var ii in filterFieldArray) {
      var plusOrMinusRegex = filterFieldArray[ii]
      var plusOrMinus = plusOrMinusRegex[0]
      var regex = plusOrMinusRegex.substring(1)
      if ('+' == plusOrMinus) {
        negativeOnly = false
      }
      var found = new RegExp(regex).test(field)
      if (found && ('-' == plusOrMinus)) {
        return false
      } else if (found) {
        return true
      }
    }
    return negativeOnly
  }

  /** Utility function to build filter fields (standalone for testability) */
  function buildFilterFieldRegex_(filterFieldArray) {
    var escapeRegExpNotStar = function(string) {
      return string.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
    var filterFields = []
    filterFieldArray
      .map(function(el) { return el.trim() })
      .filter(function(el) { return el && ('#' != el[0]) })
      .map(function(el) {
        return el //handle built-in substitutions
          .replace(
            "$$beats_fields", "/^(host|beat|input|prospector|source|offset|[@]timestamp)($|[.].*)/"
          ).replace(
            "$$docmeta_fields", "/^(_id|_index|_score|_type)$/"
          )
      })
      .forEach(function(elArrayStr) {
        ((elArrayStr.indexOf("/") >= 0)
          ? [ elArrayStr ] //(1 regex per line)
          : elArrayStr.split(","))
            .map(function(el) { return el.trim() })
            .filter(function(el) { return el && ('+' != el) && ('-' != el) })
            .filter(function(el) { return el })
            .forEach(function(el) {
              var firstEl = ('-' == el[0]) ? '-' : '+'
              if (('+' == el[0]) || ('-' == el[0])) {
                el = el.substring(1)
              }
              if (('/' == el[0]) && ('/' == el[el.length - 1])) { //already a regex
                el = el.substring(1, el.length - 1)
              } else {
                el = "^" + escapeRegExpNotStar(el).replace(/[*]/g, ".*") + "($|[.].*)"
              }
              filterFields.push(firstEl + el)
            })
      })
    return filterFields
  }

  ////////////////////////////////////////////////////

  return {
    sqlCompleter: sqlCompleter,
    painlessCompleter: painlessCompleter,

    paramsCompleter: paramsCompleter,
    queryCompleter: queryCompleter,
    queryInsertionCompleter: queryInsertionCompleter,

    registerFilterList: registerFilterList,
    registerIndexPattern: registerIndexPattern,
    dataFieldCompleter: dataFieldCompleter,

    filterFieldGroupCompleter: filterFieldGroupCompleter,

    TESTONLY: {
      isFieldWanted_: isFieldWanted_,
      buildFilterFieldRegex_: buildFilterFieldRegex_
    }
  }
}())
