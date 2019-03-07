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

  var allSql_ = [].concat(sqlMainKeywords_).concat(sqlAuxKeywords_)
    .concat(sqlFunctionsAggregate_)
    .concat(sqlFunctionsGrouping_)
    .concat(sqlFunctionsConditional_)
    .concat(sqlFunctionsScalar_)

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

  //TODO data completer

  //TODO index completer

  return {
    sqlCompleter: sqlCompleter
  }
}())
