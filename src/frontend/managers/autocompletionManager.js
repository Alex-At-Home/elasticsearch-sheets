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
  ].map(function(el) { return { caption: el + "(", value: el + "(", meta: "function (aggregate)"} })

  var sqlFunctionsGrouping_ = [
    "HISTOGRAM"
  ].map(function(el) { return { caption: el + "(", value: el + "(", meta: "function (grouping)"} })

  var sqlFunctionsConditional_ = [
    "COALESCE", "GREATEST", "IFNULL", "ISNULL", "LEAST", "NULLIF", "NVL"
  ].map(function(el) { return { caption: el + "(", value: el + "(", meta: "function (conditional)"} })

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
  ].map(function(el) { return { caption: el + "(", value: el + "(", meta: "function (scalar)"} })

  var sqlSubVariables_ = [ //TODO (may become dynamic later? with named ranges for query)
    "$$query", "$$index", "$$pagination"
  ].map(function(el) { return { caption: el, value: el, meta: "substitution variable"} })

  var allSql_ = [].concat(sqlMainKeywords_).concat(sqlAuxKeywords_)
    .concat(sqlFunctionsAggregate_)
    .concat(sqlFunctionsGrouping_)
    .concat(sqlFunctionsConditional_)
    .concat(sqlFunctionsScalar_)
    .concat(sqlSubVariables_)

  /** ACE code editor completion handler for SQL tables */
  var sqlCompleter = {
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, allSql_)
    }
  }

  // 2] ES Queries

  //TODO query completer

  // 3] Painless

  //TODO painless completer

  // 4] Dyanmic data from ES

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
    var filterFields = filterFieldArray
      .map(function(el) { return el.trim() })
      .filter(function(el) { return el && ('+' != el) && ('-' != el) })
      .map(function(el) {
        var firstEl = ('-' == el[0]) ? '-' : '+'
        if (('+' == el[0]) || ('-' == el[0])) {
          el = el.substring(1)
        }
        if (('/' == el[0]) && ('/' == el[el.length - 1])) { //already a regex
          el = el.substring(1, el.length - 1)
        } else {
          el = escapeRegExpNotStar(el).replace(/[*][*]/g, "...")
                  .replace(/[*]/g, "[^.]*")
                  .replace(/[.][.][.]/g, ".*")
        }
        return firstEl + el
      })
    return filterFields
  }

  ////////////////////////////////////////////////////

  return {
    sqlCompleter: sqlCompleter,

    registerFilterList: registerFilterList,
    registerIndexPattern: registerIndexPattern,
    dataFieldCompleter: dataFieldCompleter,

    TESTONLY: {
      isFieldWanted_: isFieldWanted_,
      buildFilterFieldRegex_: buildFilterFieldRegex_
    }
  }
}())
