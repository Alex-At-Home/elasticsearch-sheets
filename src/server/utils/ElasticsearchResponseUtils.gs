/**
 * Handles internal utils as part of  the integration between the client application and the ES configuration
 */

var ElasticsearchResponseUtils_ = (function() {

  // 0] Query utils

  /** Transforms a standard query response into rows/cols */
  function buildRowColsFromDataResponse(tableName, tableConfig, context, json, queryJson) {

    var headerSet = {}
    var hits = TableRangeUtils_.getJson(json.response.hits.hits) || []
    var flattenedHits = hits.map(function(hitJson) {
      var flattenedHit = {}
      partialFlatten_(hitJson, flattenedHit, /*topLevelOnly*/true)
      partialFlatten_(hitJson._source || {}, flattenedHit, /*topLevelOnly*/false)

      // Incorporate extra (eg script) fields:
      var fields = hitJson.fields || {}
      Object.keys(fields).forEach(function(field) {
        flattenedHit[field] = fields[field]
      })

      return flattenedHit
    })
    // Loop over the objects once to get the columns:
    flattenedHits.forEach(function(flatHit) {
      Object.keys(flatHit).forEach(function(header) {
        if (!headerSet.hasOwnProperty(header)) {
          headerSet[header] = true
        }
      })
    })
    // And now can build rows/cols:
    // Default order is sorted lexicographically:
    var sortedCols = Object.keys(headerSet)
    sortedCols.sort()
    var cols = sortedCols.map(function(header) {
      return { name: header }
    })
    return { rows: flattenedHits, cols: cols }
  }

  // 1] Aggregation utils:

  /** Transforms a complex aggregation response into rows/cols */
  function buildRowColsFromAggregationResponse(tableName, tableConfig, context, json, aggQueryJson) {

     var isObject = function(possibleObj) {
       return (possibleObj === Object(possibleObj)) && !Array.isArray(possibleObj)
     }

     var state = { headers: {}, filtered_out_fields: {}, curr: {}, saved: [], bottom_path: null }

     // Prepare some utility structures to help us navigate this mess:
     var tableColsMap = {} //(add the filter fields as the value, for convenience)
     var colsToIgnoreMap = {}
     var bucketColsMap = {}
     var tableTypes = [ 'buckets', 'metrics', 'pipelines' ]
     tableTypes.forEach(function(tableType) {
        var tableEls = tableConfig.aggregation_table[tableType] || []
        tableEls.filter(function(el) { return el.name }).forEach(function(tableEl) {
          var filterFieldsStr = (tableEl.field_filter || "").trim()
          tableColsMap[tableEl.name] = buildFilterFieldRegex_(filterFieldsStr.split(","))
          if (('-' == filterFieldsStr) || ('-**' == filterFieldsStr)) {
            colsToIgnoreMap[tableEl.name] = true
          }
          if ('buckets' == tableType) {
            bucketColsMap[tableEl.name] = true
          }
          state.headers[tableEl.name] = {}
          state.filtered_out_fields[tableEl.name] = {}
        })
     })

    // Initialize debug state, since this routine is quite fiddly:
    var debugMode = false
    var debugModeSwallowException = false //(leave this false unless debugging why a split chain is detected)
    var debugModeResetWhenBottomFound = true //(leave this true unless debugging why the wrong bottom is found)
    var debug = []
    var debugReplacer = function(key, val) { if ("saved" == key) return val.length; else return val }

  if (debugMode) debug.push({aa_type: "initialize", tableColsMap:tableColsMap, colsToIgnoreMap:colsToIgnoreMap, bucketColsMap:bucketColsMap})

     function FoundBottomOfAggregation() {} //(used as a hacky way of short-circuting the recursion as part of the control loop)

     // (arrayFieldChain is the chain of table elements that include arrays, subFieldChain nests below the last table col - aka parentField)
     var recursiveRowColumnBuilder = function(mutableState, objCursor, parentField, arrayFieldChain, subFieldChain, candidateBottom) { if (isObject(objCursor)) {

  if (debugMode) debug.push({aa_type: "obj", mutableState:JSON.stringify(mutableState, debugReplacer), objCursor:Object.keys(objCursor), parentField:parentField, arrayFieldChain:arrayFieldChain, subFieldChain:subFieldChain, candidateBottom: candidateBottom})

        var thereAreArraysLowerDown = false
        var colsAtThisLevel = []
        var objectKeys = Object.keys(objCursor)
        if (mutableState.bottom_path && (objectKeys.length > 1)) {
          if (objCursor.hasOwnProperty("buckets")) {
             objectKeys = objectKeys.filter(function(el) { return "buckets" != el }).concat([ "buckets" ])

  if (debugMode) debug.push("rearrange-bucket: " + objectKeys)

          } else {
             var positionInArray = mutableState.bottom_path.indexOf(arrayFieldChain)
             if (0 == positionInArray) {
                var candidateField = mutableState.bottom_path.substring(arrayFieldChain.length + 1).split(".", 1)[0] //(+1 for the leading ".")
                if (candidateField && objCursor.hasOwnProperty(candidateField)) {
                   objectKeys = objectKeys.filter(function(el) { return candidateField != el }).concat([ candidateField ])

  if (debugMode) debug.push("rearrange: " + candidateField + ": " + objectKeys)
                }
             }
          }
        }
        objectKeys.forEach(function(field)
        {
           var isArray = Array.isArray(objCursor[field])

  if (debugMode) debug.push("field " + field + " array?=" + isArray + " obj?=" + isObject(objCursor[field]))

           if ('buckets' == field) {

  if (debugMode) debug[debug.length - 1] = "buckets: " + debug[debug.length - 1]

             // A new intermediate field to recurse down into
             // Buckets can either be an array or an object, we'll switch to an array with a 'key' field to make life easy
             var arrayToUse = objCursor[field] || []
             if (isObject(objCursor[field])) {
                arrayToUse = []
                Object.keys(objCursor[field] || {}).forEach(function(el) {
                   var elObj = objCursor[field][el] || {}
                   elObj.key = el
                   arrayToUse.push(elObj)
                })
             }
             thereAreArraysLowerDown = true
             recursiveRowColumnBuilder(mutableState, arrayToUse, parentField, arrayFieldChain + "." + parentField, subFieldChain, false)
           } else if (colsToIgnoreMap.hasOwnProperty(field)) {
             // do nothing, it's a column set we're ignoring
           } else if (
              tableColsMap.hasOwnProperty(field) && // it's a table column
              (!parentField || bucketColsMap.hasOwnProperty(parentField)) && // it is nested under a column that is allowed "children"
              (isArray || isObject(objCursor[field]))) // it's an object/array (so primitives don't collide with fields)
           {

  if (debugMode) debug[debug.length - 1] = "table-col: " + debug[debug.length - 1]

              // We've hit an aggregation
              colsAtThisLevel.push(field)
              if (!mutableState.curr.hasOwnProperty(field)) {
                mutableState.curr[field] = {} //(makes life slightly easier below)
              }
              var newArrayChain = isArray ? (arrayFieldChain + "." + field) : arrayFieldChain
              thereAreArraysLowerDown |= recursiveRowColumnBuilder(mutableState, objCursor[field] || {}, field, newArrayChain, "", false)

           } else if (parentField) {

  if (debugMode) debug[debug.length - 1] = "metric: " + debug[debug.length - 1]

              var newSubFieldChain = subFieldChain ? (subFieldChain + "." + field) : field
              if (isArray || isObject(objCursor[field])) {
                 var arrayKey = isArray ? ("." + field) : ""
                 thereAreArraysLowerDown |=
                    recursiveRowColumnBuilder(mutableState, objCursor[field] || {}, parentField, arrayFieldChain + arrayKey, newSubFieldChain, false)
              } else { // atomic value
                // Metrics to insert under the current parent field
                // First check if it's a new field
                var metricInHeaders =
                  mutableState.headers[parentField].hasOwnProperty(newSubFieldChain)
                var metricIsAlreadyFilteredOut = !metricInHeaders &&
                  mutableState.filtered_out_fields[parentField].hasOwnProperty(newSubFieldChain)
                var metricNotFilteredOut = metricInHeaders ||
                  (!metricIsAlreadyFilteredOut &&
                    isFieldWanted_(newSubFieldChain, tableColsMap[parentField])
                  )
                if (!metricInHeaders && metricNotFilteredOut) {
                   mutableState.headers[parentField][newSubFieldChain] = true
                }
                if (metricInHeaders || metricNotFilteredOut) {
                   if (objCursor.hasOwnProperty(field)) {
                     mutableState.curr[parentField][newSubFieldChain] = objCursor[field]
                   } else {
                     mutableState.curr[parentField][newSubFieldChain] = ""
                   }
                }
                if (!metricNotFilteredOut && !metricIsAlreadyFilteredOut) {
                  //(quick optimization so only have to call isFieldWanted_ once)
                  mutableState.filtered_out_fields[parentField][newSubFieldChain] = true
                }
              }
           } //(otherwise ignore this field)
        })//(end loop over keys)
        if (candidateBottom && !thereAreArraysLowerDown) {
           if (mutableState.bottom_path && (mutableState.bottom_path != arrayFieldChain)) {

  if (debugMode && debugModeSwallowException) debug.push("ERROR: [" + arrayFieldChain + "] vs [" + mutableState.bottom_path + "], "); else
              throw new Error(
                    "By policy, only allowed a single chain of nested aggregations - [" + arrayFieldChain + "] vs [" + mutableState.bottom_path + "], " +
                    "if you need intermediate buckets you can filter them out by setting 'filter_field' to '-' or '-**'"
              )
           } else if (!mutableState.bottom_path) {
              mutableState.bottom_path = arrayFieldChain
              // OK so we now know where the bottom path is. So now we need to re-run from the start but with bottom path set
              // horrible though it is, the quickest way to short-circuit the recursion is to throw

  if (debugMode) debug.push("restart: " + arrayFieldChain)

              throw new FoundBottomOfAggregation()
           }
           var copyOfCurr = JSON.parse(JSON.stringify(mutableState.curr))
           mutableState.saved.push(copyOfCurr)
        }
        // Remove all bucket sub-fields

  if (debugMode) if (colsAtThisLevel.length > 0) debug.push("clear-vals: " + colsAtThisLevel)

        colsAtThisLevel.forEach(function(el) {
            mutableState.curr[el] = {} //TODO: this causes issues with stats pertaining to the bucket, but really we don't want them anyway...
        })
        return thereAreArraysLowerDown

       } else if (Array.isArray(objCursor)) {

  if (debugMode) debug.push({aa_type: "array", mutableState:JSON.stringify(mutableState, debugReplacer), objCursor:objCursor.length, parentField:parentField, arrayFieldChain:arrayFieldChain, subFieldChain:subFieldChain})

           objCursor.forEach(function(el) {
              recursiveRowColumnBuilder(mutableState, el, parentField, arrayFieldChain, subFieldChain, /*candidateBottom*/true)

              // After each array element, we'll remove any values from curr:
              mutableState.curr[parentField] = {}
              //TODO: ugh this is a slight problem since if we're sibling to buckets we'll get deleted here
           })
           return true //(in an array)
        } else { // primitive - translate into a trivial object so we can re-use the code above

  if (debugMode) debug.push({aa_type: "primitive", mutableState:JSON.stringify(mutableState, debugReplacer), objCursor:objCursor, parentField:parentField, arrayFieldChain:arrayFieldChain, subFieldChain:subFieldChain, candidateBottom:candidateBottom})

           recursiveRowColumnBuilder(mutableState, { value: objCursor }, parentField, arrayFieldChain, subFieldChain, candidateBottom)
           return false //(value can't include an array)
        }
     }//end recursive function

     var startingObjCursor = json.response.aggregations || {}
     try {
        recursiveRowColumnBuilder(state, startingObjCursor, "", "", "", false)
     } catch (e) {
        if (e instanceof FoundBottomOfAggregation) {
          state.saved = [] //(reset some state)
          state.curr = {}

  if (debugMode && debugModeResetWhenBottomFound) debug = []

          recursiveRowColumnBuilder(state, startingObjCursor, "", "", "", false)
        } else {
           throw e
        }
     }

     //Special case: no buckets, just have a single row with all the metrics in them:
     if (0 == state.saved.length) {
        var workaroundObj = [ startingObjCursor ]
        // (rerun with bottom path set)
        state.bottom_path = "-"
        recursiveRowColumnBuilder(state, workaroundObj, "", "-", "", true)
     }

    if (debugMode) {
      var debugSliceStart = 0
      var debugSliceEnd = 100
      return debug.slice(debugSliceStart, debugSliceEnd)
    }

     // Sample format:
     // aggregations:
     //   field1:
     //     buckets:
     //       key: field1_val
     //       buckets:
     //         field2:
     //           key: field2_val
     //           <either same again for field3, AND/OR other fields
     //           metric_field1: { misc_fields, usually "value" .. "value" can be array or obj in MR case }
     // (under some cases buckets can be an object indexed by key)

     retVal = { rows: [], cols: [] }
     var headerIterator = function(fn) {
       Object.keys(state.headers).forEach(function(tableEl) {
         var subFields = state.headers[tableEl] || {}
         var headers = Object.keys(subFields) // (move keys to the start)
         var headersWithKeys = headers.filter(function(el) { return el.indexOf("key") == 0 })
         headers = headers.filter(function(el) { return el.indexOf("key") != 0 })
         headersWithKeys.concat(headers).forEach(function(subField) {
           fn(tableEl, subField)
         })
       })
     }
     var foundHeaders = false
     headerIterator(function(tableEl, subField) {
       var index = retVal.cols.length
       retVal.cols.push({ name: tableEl + "." + subField, index: index })
       foundHeaders = true
     })
     if (foundHeaders) {
       state.saved.forEach(function(row) {
         var rowArray = []
         headerIterator(function(tableEl, subField) {
           var colJson = (row[tableEl] || {})
           if (colJson.hasOwnProperty(subField)) {
              rowArray.push(colJson[subField])
           } else {
             rowArray.push("")
           }
         })
         retVal.rows.push(rowArray)
       })
     }
     return retVal
  }

  // 2] General response logic

  /** Generic row/col handler for ES responses - rows can be either [ { }. ... ] or [ []. ...], cols: [ { name: }, ... ] */
  function handleRowColResponse(tableName, tableConfig, context, json, rows, fullCols, supportsSize, numHits) {
    var ss = SpreadsheetApp.getActive()
    var tableRange = TableRangeUtils_.findTableRange(ss, tableName)
    var range = null
    if (null == tableRange) { //(use current selection, test mode
       range = ss.getActiveRange()
    } else {
       range = tableRange.getRange()
    }

     if (null != json.response) {
        /** Apply the global filters to the cols and re-order as desired */
        var filteredCols = calculateFilteredCols(
          fullCols,
          TableRangeUtils_.getJson(tableConfig, [ "common", "headers" ]) || {}
        )
        var warnings = []

        var numDataCols = filteredCols.length
        var numDataRows = rows.length

        var currRow = 1
        var numTableRows = range.getNumRows()
        var numTableCols = range.getNumColumns()

        // Get special row info:
        var specialRows = TableRangeUtils_.buildSpecialRowInfo(tableConfig)

        //TODO: handle skipping specified rows and cols

        // Handle headers (if enabled)
        if (numTableCols < numDataCols) {
           warnings.push("Table not wide enough for all columns, needs to be [" + numDataCols + "], is only [" + numTableCols + "]")
        }

        if (specialRows.headers != 0) {
           for (var i = 0; i < numTableCols; ++i) {
              var cell = range.getCell(specialRows.headers, i + 1)
              if (i < numDataCols) {
                 var nameOrAliasObj = fullCols[filteredCols[i]]
                 var nameOrAlias = nameOrAliasObj.alias || nameOrAliasObj.name
                 cell.setValue(nameOrAlias)
              } else {
                 cell.clearContent()
              }
           }
        }

        var paginationSetup = (specialRows.pagination != 0)
        var dataRowOffset = 0
        if (paginationSetup && (null == numHits)) {
           dataRowOffset = (context.table_meta.page - 1)*context.table_meta.data_size
        }

        ElasticsearchRequestUtils_.convertSpecialRows(specialRows, numTableRows)

        // Write data
        var rowArray = []
        var startRow = -1
        while ((dataRowOffset < numDataRows) && (currRow <= numTableRows)) {
           if ((currRow == specialRows.pagination) || (currRow == specialRows.headers) ||
               (currRow == specialRows.status) || (currRow == specialRows.query_bar))
           {
              currRow++
              continue
           }
           if (startRow < 0) {
             startRow = currRow
           }
           var colArray = []
           var row = rows[dataRowOffset]
           var rowIsArray = Array.isArray(row)
           for (var i = 0; i < numTableCols; ++i) {
              if (i < numDataCols) {
                 if (rowIsArray) {
                   var index = fullCols[filteredCols[i]].index
                   colArray.push(row[index])
                 } else {
                   var colName = fullCols[filteredCols[i]].name
                   if (row.hasOwnProperty(colName)) {
                     colArray.push(row[colName])
                   } else {
                      colArray.push("")
                   }
                 }
              } else {
                 break //(data cleared below)
              }
           }
           rowArray.push(colArray)
           dataRowOffset++
           currRow++
        }
        //(write 2d array)
        if (rowArray.length > 0) {
          cell = range.getCell(startRow, 1)
                  .offset(0, 0, rowArray.length, rowArray[0].length)
                  .setValues(rowArray)
        }
        //(clear space to the left for rows we've written to - other rows handled below)
        if (numTableCols > numDataCols) {
          var rowsWritten = (startRow > 0) ? currRow - startRow : 0
          if (rowsWritten > 0) {
            range.offset(startRow - 1, numDataCols, rowsWritten, numTableCols - numDataCols).clearContent()
          }
        }

        // Handle - more/less data than we can write?
        if (dataRowOffset < numDataRows) { // still have data left to write
          var numDataRowsOrTotalHits = (null != numHits) ? numHits : numDataRows
           if (paginationSetup) { // fake pagination but we can use this to tell users if there is more data or not
              var pageInfoCell = range.getCell(context.table_meta.page_info_offset.row, context.table_meta.page_info_offset.col - 1)
              if (supportsSize) {
                var actualPages = Math.ceil(numDataRowsOrTotalHits/context.table_meta.data_size)
                 pageInfoCell.setValue("Page (of " + actualPages + "):")
              } else {
                 pageInfoCell.setValue("Page (of > " + context.table_meta.page + "):")
              }
           } else {
              warnings.push("Table not deep enough for all rows, needs to be [" + numDataRowsOrTotalHits + "], is only [" + dataRowOffset + "]")
           }
        } else {
          //(quick check that we didn't land on a special row>)
          while ((currRow == specialRows.pagination) || (currRow == specialRows.headers) ||
              (currRow == specialRows.status) || (currRow == specialRows.query_bar))
          {
             currRow++
             continue
          }
          var numTableDataRows = numTableRows
          while ((numTableDataRows == specialRows.pagination) || (numTableDataRows == specialRows.headers) ||
              (numTableDataRows == specialRows.status) || (numTableDataRows == specialRows.query_bar))
          {
             numTableDataRows--
             continue
          }
          // Clear remaining data rows:
          var rowsLeft = numTableDataRows - (currRow - 1) //(-1 because we're moving from co-ords starting at (1,1) to offset starting at (0,0))
          if (rowsLeft > 0) {
             range.offset(currRow - 1, 0, rowsLeft).clearContent()
          }
          // Update pagination
          if (paginationSetup) {
            var page = (null == numHits) ? context.table_meta.page :
              Math.ceil(numHits/context.table_meta.data_size)
            if ((null == numHits) && (startRow < 0)) { //special case, no data at all
              page = "< " + page
            }
            range.getCell(context.table_meta.page_info_offset.row, context.table_meta.page_info_offset.col - 1)
                .setValue("Page (of " + page + "):")
          } else if ((null != numHits) && (dataRowOffset < numHits)) {
            // We have the exact hits so can tell
            warnings.push("Table not deep enough for all rows, needs to be [" + numHits + "], is only [" + dataRowOffset + "]")
          }
        }

        // Write warnings to status (never to toaster)
        if (context.table_meta.status_offset) {
           var warningText = ""
           if (warnings.length > 0) {
              warningText = ": (WARNINGS = " + warnings.map(function(x) { return "[" + x + "]" }).join(", ") + ")"
           }
           setQueryResponseInStatus_(range, context.table_meta.status_offset,
             "SUCCESS [" + TableRangeUtils_.formatDate() + "]" + warningText)
        }
     } else if (null != json.error_message) {
        // Write errors to status or toaster
        var requestError = (null != json.error_object) ?
          "ERROR [" + TableRangeUtils_.formatDate() + "]" + ": status = [" + json.status + "], msg = [" + json.error_message + "], error_json = [\n" + JSON.stringify(json.error_object, null, 3) + "\n]"
          :
          "ERROR [" + TableRangeUtils_.formatDate() + "]" + ": status = [" + json.status + "], msg = [" + json.error_message + "], query = [" + json.query_string + "]"

        if (context.table_meta.status_offset) {
           setQueryResponseInStatus_(range, context.table_meta.status_offset, requestError)
        } else { // pop up toaster
           showStatus("[" + tableName + "]: " + requestError, "Query Error")
        }
     }
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

  ////////////////////////////////////////////////////////

  // Internal utils:

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

  function isFieldWanted_(field, filterFieldArray, onMatchFn) { //(see buildFilterFieldRegex_)
    var negativeOnly = true
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
        if (onMatchFn) {
          onMatchFn(plusOrMinusRegex, ii)
        }
        return true
      }
    }
    if (onMatchFn && negativeOnly) { //passses by default
      onMatchFn("#", -1)
    }
    return negativeOnly
  }

  /** Flattens an object up to an array, and returns arrays as stringified JSON */
  function partialFlatten_(inObj, outObj, topLevelOnly) {
    var isObject = function(possibleObj) {
      return (possibleObj === Object(possibleObj)) && !Array.isArray(possibleObj)
    }
    var partialFlattenRecurse = function(curr, out, fieldPath) {
      Object.keys(curr).forEach(function(key) {
        var val = curr[key]
        var newFieldPath = (fieldPath.length > 0) ? fieldPath + "." + key : key

        if (null == val) { //(do nothing, gets cleared)
        } else if (Array.isArray(val)) {
          if (!topLevelOnly) {
            if (val.length > 0) { //(else do nothing, leave as blank)
              if (isObject(val[0]) ||
                  (typeof val[0] == 'string' || val[0] instanceof String)) //(string or object, likely too big to render normally)
              {
                out[newFieldPath] = '=summarizeEsSubTable(\n' +
                  val.map(function(el) {
                    return '"' + JSON.stringify(el).replace(/["]/g, '""') + '"'
                  }).join(",\n") +
                  '\n)'
              } else { // number/bool
                out[newFieldPath] = JSON.stringify(val)
              }
            }
          } //(else do nothing)
        } else if (isObject(val)) {
          if (!topLevelOnly) {
            partialFlattenRecurse(val, out, newFieldPath)
          }
        } else { // primitive
          out[newFieldPath] = val
        }
      })
    }
    partialFlattenRecurse(inObj, outObj, "")
  }

  /** Adds the error info the status, if necessary */
  function setQueryResponseInStatus_(range, statusLocation, errorString) {
     range.getCell(statusLocation.row, statusLocation.col).setValue(errorString)
  }

  ////////////////////////////////////////////////////////

  return {
    buildRowColsFromAggregationResponse: buildRowColsFromAggregationResponse,
    buildRowColsFromDataResponse: buildRowColsFromDataResponse,
    handleRowColResponse: handleRowColResponse,

    calculateFilteredCols: calculateFilteredCols,

    TESTONLY: {
      buildFilterFieldRegex_: buildFilterFieldRegex_,
      isFieldWanted_: isFieldWanted_,

      partialFlatten_: partialFlatten_
    }
  }
}())
