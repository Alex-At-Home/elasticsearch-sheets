/**
 * Handles internal utils as part of  the integration between the client application and the ES configuration
 */

var ElasticsearchRequestUtils_ = (function() {

  /** Build the table outline + query bar/status info/pagination
   * returns:
   * { "query": string, "data_size": int, "page": int, <- these are used by the client to build the query
   *    status_offset: { row: int, col: int }, <- passed back post query completion to avoid double calling
   *    page_info_offset: { row: int, col: int } }  <- passed back post query completion to avoid double calling
   * (page starts at 1)
   */
  function buildTableOutline(tableName, tableConfig, activeRange, statusInfo, testMode) {

     var retVal = { } //(gets filled in as the method progresses)

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
     var formatTheme = TableRangeUtils_.getJson(tableConfig, [ "common", "formatting", "theme" ]) || "none"

     var getRow = function(n) {
        if (n >= 0) {
           return n
        } else {
           return rangeRows + 1 + n
        }
     }

     var specialRows = TableRangeUtils_.buildSpecialRowInfo(tableConfig)
     convertSpecialRows_(specialRows, rangeRows)

     // How we handle formatting:
     // none - complately manual
     // minimal - we manage the header rows (just bold, no background - some borders in the future)
     // (in the future, a more colorful headers management, and also manage data with alternating rows)
     if (!testMode) resetExSpecialRowFormats_(activeRange, specialRows, formatTheme)

     // Query bar

     if (0 != specialRows.query_bar) {
        dataSize--

        var queryStart = 1
        var queryEnd = rangeCols
        var queryRow = specialRows.query_bar
        if (specialRows.query_bar == specialRows.status) { // status and query bar merged
            queryEnd = queryEnd - 2 //(2 cells for status)
        }
        // Unmerge everything on this row and clear format
        if (!testMode) switch (formatTheme) {
           case "none":
              break
           default:
              activeRange.offset(queryRow - 1, 0, 1).breakApart().clearFormat()
              break
        }
        // Query title:
        var queryTitleCell = activeRange.getCell(queryRow, 1)
        var replaceCurrentQuery = "Query:" == queryTitleCell.getValue()
        if (!replaceCurrentQuery) {
           if (!testMode) queryTitleCell.setValue("Query:")
        }
        // Query bar
        var queryCells = activeRange.offset(queryRow - 1, queryStart, 1, queryEnd - queryStart)
        if (!replaceCurrentQuery) {
           queryCells.setValue("")
        }
        retVal.query = queryCells.getValue()
        // Status:
        if (specialRows.query_bar == specialRows.status) {
           var statusTitleCell = activeRange.getCell(queryRow, queryEnd + 1)
           if (!testMode) statusTitleCell.setValue("Status:")
           if (null != statusInfo) {
             var statusCell = activeRange.getCell(queryRow, queryEnd + 2)
             if (!testMode) statusCell.setValue(statusInfo)
           }
           retVal.status_offset = { row: queryRow, col: queryEnd + 2 }
        }
        if (!testMode) switch (formatTheme) {
           case "none": break
           default:
              if (specialRows.query_bar == specialRows.status) {
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
        var statusRow = specialRows.status
        // Unmerge everything on this row and clear format
        if (!testMode) switch (formatTheme) {
           case "none":
              break
           default:
              activeRange.offset(statusRow - 1, 0, 1).breakApart().clearFormat()
              break
        }
        // Status title:
        var statusTitleCell = activeRange.getCell(statusRow, 1)
        if (!testMode) statusTitleCell.setValue("Status:")
        // Status info
        var statusCells = activeRange.offset(statusRow - 1, statusStart, 1, statusEnd - statusStart)
        if (null != statusInfo) {
            if (!testMode) statusCells.setValue(statusInfo)
        }
        retVal.status_offset = { row: statusRow, col: 2 }

        if (!testMode) switch (formatTheme) {
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
        var headersRow = specialRows.headers
        // Unmerge everything on this row, clear format, and set to bold
        if (!testMode) switch (formatTheme) {
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
        var paginationEnd = 2
        var paginationRow = specialRows.pagination
        // Unmerge everything on this row and clear format
        if (!testMode) switch (formatTheme) {
           case "none":
              break
           default:
              activeRange.offset(paginationRow - 1, 0, 1).breakApart().clearFormat()
              activeRange.offset(paginationRow - 1, 2, 1, rangeCols - 2).clear()
              break
        }
        // Page info
        var pageInfoCell = activeRange.getCell(paginationRow, 1)
        var replaceCurrentPage = 0 != pageInfoCell.getValue().indexOf("Page (")
        if (!testMode) pageInfoCell.setValue("Page (of ???):")
        retVal.page_info_offset = { row: paginationRow, col: 2 }
        // Page offset
        var pageCell = activeRange.getCell(paginationRow, 2)
        if (replaceCurrentPage) {
           if (!testMode) pageCell.setValue(1)
        }
        var currPage = parseInt(pageCell.getValue())
        if (!currPage || (NaN == currPage) || ("" == currPage)) {
           currPage = 1
           if (!testMode) pageCell.setValue("" + currPage)
        }
        retVal.page = currPage

        // Status:
        if (specialRows.pagination == specialRows.status) {
           var statusTitleCell = activeRange.getCell(paginationRow, paginationEnd + 1)
           if (!testMode) statusTitleCell.setValue("Status:")
           var statusCell = activeRange.getCell(paginationRow, paginationEnd + 2)
           if (null != statusInfo) {
             if (!testMode) statusCell.setValue(statusInfo)
           }
           retVal.status_offset = { row: paginationRow, col: paginationEnd + 2 }
        }
        if (!testMode) switch (formatTheme) {
           case "none": break
           default:
              if (specialRows.pagination == specialRows.status) {
                 activeRange.getCell(paginationRow, paginationEnd + 1).setFontWeight("bold")
                 activeRange.offset(paginationRow - 1, paginationEnd + 1, 1, rangeCols - paginationEnd - 1).merge()
              }
              pageInfoCell.setFontWeight("bold")
              break
        }
     }
     retVal.data_size = dataSize
     return retVal
  }

  /** Filters, reorders and renames the columns */
  function calculateFilteredCols(mutableCols, headerMeta) {
    // Firstly, set up the alias map
    var renameMap = {}
    var fieldAliases = headerMeta.field_aliases || []
    fieldAliases = fieldAliases
      .map(function(a) { return a.trim() })
      .filter(function(a) { return (0 == a.length) || ('#' != a[0]) })
      .map(function(a) {
        var fromTo = a.split("=", 2)
        var from = fromTo[0]
        var to = fromTo[1]
        if (from && to) {
          return { from: from, to: to }
        } else {
          return null
        }
      }).filter(function(a) { return null != a })

    // Now figure out which fields match and group them according to the pattern order
    var fieldFilters = buildFilterFieldRegex_(headerMeta.field_filters || [])

    var defaultMatchField = "#"
    var matchState = {}
    mutableCols.forEach(function(mutableCol, jj) {
      var onMatch = function(firstMatchingField, index) {
        mutableCol.index = jj //(need this later)
        if (index < 0) {
          firstMatchingField = defaultMatchField
        }
        var list = matchState[firstMatchingField] || []
        matchState[firstMatchingField] = list
        list.push(mutableCol)
      }
      //(don't care about the result of this, just want)
      isFieldWanted_(mutableCol.name, fieldFilters, onMatch)
    })

    // Order within each group and apply aliases at the same time
    var globalList = []
    fieldFilters.concat([ defaultMatchField ]).forEach(function(fieldFilter) {
      var fields = matchState[fieldFilter] || []
      var startOfList = []
      var endOfList = []
      fieldAliases.forEach(function(alias) {
        fields.forEach(function(mutableCol) {
          if (mutableCol.name == alias.from) {
            mutableCol.alias = alias.to
            mutableCol.found = true
            startOfList.push(mutableCol.index)
          }
        })
      })
      globalList = globalList.concat(startOfList)
      fields.forEach(function(mutableCol) {
        if (!mutableCol.found) {
          globalList.push(mutableCol.index)
        }
      })
    })
    return globalList
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

  ////////////////////////////////////////////////////////

  // Internal utils:

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

  /** Infers the data row formats and copies over possible ex-special row formats */
  function resetExSpecialRowFormats_(activeRange, specialRows, formatTheme) {

     var rangeRows = activeRange.getNumRows()

     // Simple attempt at ensuring format is preserved
     var dataFormatRowSample = null
     var dataFormatRowSampleOffset = null
     if ("minimal" == formatTheme) {
        if (rangeRows >= 8) { // Find the first guaranteed data row
           dataFormatRowSampleOffset = 4
        } else { // (small table, make a game attempt to find a data row)
          for (var ii = 1; ii <= rangeRows - 1; ++ii) {
             if (activeRange.getCell(ii, 1).getValue().indexOf(":") < 0) {
                // (jump one more row since it could be the header, note offset and getCell have different first index)
                dataFormatRowSampleOffset = ii
                break
             }
          }
        }
        if (null != dataFormatRowSampleOffset) {
             dataFormatRowSample = activeRange.offset(dataFormatRowSampleOffset, 0, 1)

             // Now going to copy the data format to any of the first 4 or last 4
             var maybeCopyRow = function(ii) {
                if ((ii != specialRows.status) && (ii != specialRows.pagination) &&
                    (ii != specialRows.headers) && (ii != specialRows.query_bar) && ((ii + 1) != dataFormatRowSampleOffset))
                {
                   var offset = activeRange.offset(ii - 1, 0, 1)
                   dataFormatRowSample.copyTo(offset, {formatOnly:true})
                }
             }
             for (var ii = 1; ii <= 4; ++ii) { // top 4
                maybeCopyRow(ii)
             }
             for (var ii = rangeRows; (ii > rangeRows - 4) && (ii > 4); --ii) { // bottom 4, minus overlaps
                maybeCopyRow(ii)
             }
        }
     }
  }
  
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

  ////////////////////////////////////////////////////////

  return {
    buildTableOutline: buildTableOutline,
    buildAggregationQuery: buildAggregationQuery,

    TESTONLY: {
    }
  }
}())
