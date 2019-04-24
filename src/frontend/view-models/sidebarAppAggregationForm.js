var AggregationForm = (function(){
  var aggFormSuggestionList_ = {
    bucket: Object.keys(AggregationInfo.bucket),
    metric: Object.keys(AggregationInfo.metric),
    pipeline: Object.keys(AggregationInfo.pipeline)
  }
  var aggFormOneUp_ = 0 //global across all indices - not an index just a uuid

  /** Builds the UI element that manages data tables (aggregationType one of `bucket`, `metric`, `mapr` */
  function build(index, aggregationType, globalEditor, parentContainerId, json) {
    var subIndex = ++aggFormOneUp_

    var isJsonCollapsed = json ? "" : "in" // (collapse the JSON if populating from existing data)
    var isNewElement = json ? false : true
    var isMapReduce = ("map_reduce" == aggregationType)
    var json = json || { name: "FIELD" + subIndex }

    var elementIdSuffix = `AggregationForm_${aggregationType}_${index}_${subIndex}`

    var selectedAggType = json.agg_type || ''
    var helpUrl = isMapReduce ? null : AggregationInfo[aggregationType][selectedAggType]
    var helpHref = helpUrl ? `href='${helpUrl.url__}'` : ""
    var helpHidden = helpUrl ? "" : "hidden"

    var maybeCurrentLocation = ""
    if (json.location &&
      ("automatic" != json.location) && ("disabled" != json.location) && ("__root__" != json.location)
    )
      {
      maybeCurrentLocation =
        `<option value="${json.location}" selected>Bucket: ${json.location}</option>`
    }

    var aggregationTypeTemplate = isMapReduce ?
    `
    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Type</span>
    </div>
    <input type="text" class="form-control" placeholder="Aggregation type" value="Map Reduce, see (MR) below" id="mr_info_${elementIdSuffix}" disabled>
    <div class="input-group-addon" id="help_agg_type_${elementIdSuffix}">
    <span class="input-group-text"><a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-scripted-metric-aggregation.html">?</a></span>
    </div>
    </div>
    `
    :
    `
    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Type</span>
    </div>
    <input type="text" class="form-control" placeholder="Aggregation type" value="${selectedAggType}" id="agg_type_${elementIdSuffix}">
    <div class="input-group-addon ${helpHidden}" id="help_agg_type_${elementIdSuffix}">
    <span class="input-group-text"><a target="_blank" ${helpHref}>?</a></span>
    </div>
    </div>
    `

    // Handle name editing:
    var disabledNameEditor = isNewElement ?
    ""
    :
    disabledNameEditor = "readonly"

    var jsonInfo = isMapReduce ?
    `
    <label>Extra Parameters To Merge:</label>
    `
    :
    ""

    var form =
    `
    <div class="form aggregation_form_element" id="form_${elementIdSuffix}">
    <div class="form-group">

    <div class="btn-toolbar">
    <div class="btn-group">
    <button id="toggle_config_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Show/hide JSON config">
    <a data-toggle="collapse" href="#collapse0_${elementIdSuffix}"><span class='glyphicon glyphicon-wrench'></span></a>
    <!-- TODO: after a move this no longer works until the wrench of _another_ element is pressed (+doesn't seem to work first time?)
    This is probably: https://github.com/twbs/bootstrap/issues/2274 (suggestion: go with jquery show/hide?)
    -->
    </button>
    </div>
    <div class="btn-group">
    <button id="move_up_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Move aggregation up"><span class='glyphicon glyphicon-menu-up'></span></button>
    <button id="move_down_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Move aggregation down"><span class='glyphicon glyphicon-menu-down'></span></button>
    </div>
    <div class="btn-group">
    <button id="delete_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Delete aggregation"><span class='glyphicon glyphicon-remove-sign'></span></button>
    </div>
    </div>

    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Name</span>
    </div>
    <input type="text" class="form-control" placeholder="Field name" value="${json.name || ''}" id="name_${elementIdSuffix}" ${disabledNameEditor}>
    <span class="input-group-btn">
    <button id="editname_${elementIdSuffix}" class="btn btn-default" type="button" data-toggle="tooltip" title="Edit name"><span class='glyphicon glyphicon-pencil'></span></button>
    </span>
    </div>

    ${aggregationTypeTemplate}

    <div id="collapse0_${elementIdSuffix}" class="panel-collapse collapse ${isJsonCollapsed}">

    ${jsonInfo}

    <div id="editor_${elementIdSuffix}" class="medium_ace_editor">
    </div>

    <div class="panel-group">
    <div class="panel panel-default">
    <label>
    <a data-toggle="collapse" href="#collapse1_${elementIdSuffix}">Advanced</a>
    </label>
    <div id="collapse1_${elementIdSuffix}" class="panel-collapse collapse">

    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Field formatting</span>
    </div>
    <input type="text" class="form-control" placeholder="[+-]glob or /regex/" value="${json.field_filter || ''}" id="field_filter_${elementIdSuffix}">
    </div>

    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Location</span>
    </div>
    <select class="form-control for-shorter-text" id="location_${elementIdSuffix}">
    <option value="automatic">Automatic</option>
    <option value="__root__" ${("__root__" == json.location) ? "selected" : ""}>Root</option>
    <option value="disabled" ${("disabled" == json.location) ? "selected" : ""}>Disabled</option>
    ${maybeCurrentLocation}
    </select>
    </div>
    </div>
    </div>
    </div>
    </div>
    </div>
    </div>
    `

    $(`#${parentContainerId}`).append(form).append(function(){

      // When complete...
      if (isNewElement) {
        var insertPath = getAggFormPath_(aggregationType)
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          var arrayToAppend = Util.getOrPutJsonArray(currJson, insertPath)
          arrayToAppend.push(json)
        })
      }

      // Build JSON editor
      var formEditor = ace.edit(`editor_${elementIdSuffix}`)
      formEditor.session.setMode("ace/mode/json")
      formEditor.session.setTabSize(3)
      formEditor.session.setUseWrapMode(true)
      formEditor.session.setValue(JSON.stringify(json.config || {}, null, 3))
      formEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      formEditor.completers = [
        AutocompletionManager.dataFieldCompleter(`index_agg_${index}`, "raw"),
        AutocompletionManager.aggregationOutputCompleter(TableManager.getTableId(index)),
        AutocompletionManager.scriptFieldsCompleter(TableManager.getTableId(index), "labels")
      ]

      // Set-up autocomplete on type:
      if (!isMapReduce) {
        var mySuggestions =  aggFormSuggestionList_[aggregationType]
        var selectOrChange = function(newValue) {
          Util.updateRawJsonNow(globalEditor, function(currJson) {
            var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)

            var selected = newValue
            var newJson = Util.shallowCopy(AggregationInfo[aggregationType][selected])
            var url = newJson['url__']
            var defaultFieldFilter = newJson['default_filter__']
            if (url) { // set href for "? and show
            $(`#help_agg_type_${elementIdSuffix} a`).attr("href", url)
            $(`#help_agg_type_${elementIdSuffix}`).removeClass('hidden')
          } else {
            $(`#help_agg_type_${elementIdSuffix} a`).removeAttr("href")
            $(`#help_agg_type_${elementIdSuffix}`).addClass('hidden')
          }
          delete newJson['url__']
          delete newJson['default_filter__']
          var newJsonStr = JSON.stringify(newJson, null, 3)

          // Need to check if we're going to mess up existing content:
          var currDefaultForType = JSON.stringify(
            Util.shallowCopy(AggregationInfo[aggregationType][currJsonForm.agg_type || ""] || {}, "url__")
          )
          var currContents = JSON.stringify(currJsonForm.config || {})

          // We will always overwrite the agg_type
          currJsonForm.agg_type = newValue

          // But the contents we'll leave alone if it's non-default
          if (("{}" == currContents) || (currContents == currDefaultForType)) {
            formEditor.session.setValue(newJsonStr)
            currJsonForm.config = newJson
          }
          // And save for filter field override:
          var currFilter = currJsonForm.field_filter
          if (!currFilter && defaultFieldFilter) { // not overwriting anything)
            currJsonForm.field_filter = defaultFieldFilter
            $(`#field_filter_${elementIdSuffix}`).val(defaultFieldFilter)
          }
          //(in both cases - else do nothing, user has already entered data)
        })
      }
      $(`#agg_type_${elementIdSuffix}`).autocomplete({
        minLength: 0,
        source: function(request, response) {
          var data = $.grep(mySuggestions, function(value) {
            return value.substring(0, request.term.length).toLowerCase() == request.term.toLowerCase()
          });
          response(data)
        },
        select: function(event, ui) { selectOrChange(ui.item.value) },
        change: function(event, ui) { selectOrChange($(`#agg_type_${elementIdSuffix}`).val()) }
      }).focus(function () {
        if ("" == $(this).val()) { // only insta-display options if textbox empty
          $(this).autocomplete("search", "")
        }
      })
    } else { // Map reduce, just set the type
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
        currJsonForm.agg_type = "__map_reduce__"
      })
    }

    // Handle the control buttons
    $(`#move_up_${elementIdSuffix}`).click(function(){
      var subIndex = getCurrAggFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        moveCurrAggFormJson_(subIndex, -1, aggregationType, currJson)
      })
      var prev = $(`#form_${elementIdSuffix}`).prev()
      $(`#form_${elementIdSuffix}`).insertBefore(prev)
    })
    $(`#move_down_${elementIdSuffix}`).click(function(){
      var subIndex = getCurrAggFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        moveCurrAggFormJson_(subIndex, +1, aggregationType, currJson)
      })
      var next = $(`#form_${elementIdSuffix}`).next()
      $(`#form_${elementIdSuffix}`).insertAfter(next)
    })
    $(`#delete_${elementIdSuffix}`).click(function(){
      var deleteMetric = function() {
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          // Do we have any dependents? Fail out if so:
          var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
          var dependentMap = getAggFormNameParents_(currJson)
          var dependents = dependentMap[currJsonForm.name] || []
          if (dependents.length > 0) {
            Util.showStatus(
              "Cannot delete because of the following dependents (change their location/delete them first): " + dependents,
              "Client error"
            )
          } else {
            var subIndex = getCurrAggFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
            deleteCurrAggFormJson_(subIndex, aggregationType, currJson)
            $(`#form_${elementIdSuffix}`).remove()
          }
        })
      }
      if (TableManager.isStandalone()) {
        if (confirm("Are you sure you want to delete this metric? Click OK to proceed")) {
          deleteMetric()
        }
      } else {
        Util.launchYesNoPrompt(
          "Delete metric", "Are you sure you want to delete this metric?",
          deleteMetric
        )
      }
    })

    // Other change handlers:

    // JSON editor
    formEditor.session.on('change', function(delta) {
      Util.updateRawJson(globalEditor, function(currJson) {
        var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
        try {
          currJsonForm.config = JSON.parse(formEditor.session.getValue())
        } catch (err) {} //(do nothing if it's not valid JSON)
      })
    })

    // Field filter
    $(`#field_filter_${elementIdSuffix}`).on("input", function(e) {
      var thisValue = this.value
      Util.updateRawJson(globalEditor, function(currJson) {
        var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
        currJsonForm.field_filter = thisValue
      })
    })
    // Name
    var onNameChange = function(thisValue, alwaysReturnTrue) {
      $(`#name_${elementIdSuffix}`).prop('readonly', function(i, isReadonly) {
        if (!isReadonly && thisValue) {
          var subIndex = getCurrAggFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
          Util.updateRawJsonNow(globalEditor, function(currJson) {
            // Ensure all names are unique:
            var nameMap = getAggFormNameMap_(currJson, subIndex, aggregationType)
            for (var i = 0; ; i++) {
              if (nameMap[thisValue]) { // this name exists, so change it
                thisValue = thisValue + i
                $(`#name_${elementIdSuffix}`).val(thisValue)
              } else {
                break
              }
            }
            var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
            // Update dependent names:
            getAggFormNameParents_(currJson, currJsonForm.name, thisValue)
            currJsonForm.name = thisValue
          })
        }
        return alwaysReturnTrue || !isReadonly
      })
    }
    $(`#name_${elementIdSuffix}`).focusout(function() {
      onNameChange(this.value, /*alwaysReturnTrue*/true)
    })
    $(`#editname_${elementIdSuffix}`).on('mousedown', function() {
      onNameChange($(`#name_${elementIdSuffix}`).val(), /*alwaysReturnTrue*/false)
    })
    // Location
    $(`#location_${elementIdSuffix}`).change(function() {
      var thisValue = this.value
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
        currJsonForm.location = thisValue
      })
    })

    // Whenever we change the state of the advanced, reload the
    $(`#collapse1_${elementIdSuffix}`).on('shown.bs.collapse', function () {
      var currLocationVal = $(`#location_${elementIdSuffix}`).val()
      AutocompletionManager.aggregationOutputCompleter(TableManager.getTableId(index), [ "buckets" ])
        .getCompletions(null, null, null, null, function(unused, bucketList) {
          var nameMap = { "automatic": true, "disabled": true, "__root__": true }
          bucketList.forEach(function(bucketMeta) {
            nameMap[bucketMeta.value] = true
          })
          $(`#location_${elementIdSuffix}`).empty()
          var defaultElements = [
            `<option value="automatic">Automatic</option>`,
            `<option value="disabled">Disabled</option>`,
            `<option value="__root__">Root</option>`
          ]
          $(`#location_${elementIdSuffix}`).append(
            defaultElements.concat(bucketList.map(function(bucketMeta) {
              var name = bucketMeta.value
              return `<option value="${name}">Bucket: ${name}</option>`
            }))
          )
          if (!nameMap.hasOwnProperty(currLocationVal)) {
            // my name must have been changed, figure out what it now is:
            var jsonStr = globalEditor.session.getValue()
            var currJson = JSON.parse(jsonStr)
            var currJsonForm = getCurrAggFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, aggregationType, currJson)
            $(`#location_${elementIdSuffix}`).val(currJsonForm.location || "automatic").change()
          } else {
            $(`#location_${elementIdSuffix}`).val(currLocationVal).change()
          }
        })
    })
  })
}

/** Handy utility for pointing at the right aggregation array */
function getAggFormPath_(aggregationType) {
  if ("bucket" == aggregationType) {
    return [ "aggregation_table", "buckets" ]
  } else if ("pipeline" == aggregationType) {
    return [ "aggregation_table", "pipelines" ]
  } else {
    return [ "aggregation_table", "metrics" ]
  }
}
/** Removes the JSON element at the specified index */
function deleteCurrAggFormJson_(subIndex, aggregationType, parentJson) {
  var jsonArray = Util.getOrPutJsonArray(parentJson, getAggFormPath_(aggregationType))
  jsonArray.splice(subIndex, 1)
}
/** Moves the JSON element at the specified index */
function moveCurrAggFormJson_(subIndex, offset, aggregationType, parentJson) {
  var jsonArray = Util.getOrPutJsonArray(parentJson, getAggFormPath_(aggregationType))
  var newIndex = subIndex + offset
  if (newIndex < 0) {
    newIndex = 0
  } else if (newIndex >= jsonArray.length) {
    newIndex = jsonArray.length - 1
  }
  jsonArray.splice(newIndex, 0, jsonArray.splice(subIndex, 1)[0])
}
/** Returns the JSON element at the specified index */
function getCurrAggFormJson_(formDiv, parentContainerId, aggregationType, parentJson) {
  var index = getCurrAggFormJsonIndex_(formDiv, parentContainerId)
  var jsonArray = Util.getJson(parentJson, getAggFormPath_(aggregationType)) || []
  return jsonArray[index]
}
/** Returns the index of the specified form */
function getCurrAggFormJsonIndex_(formDiv, parentContainerId) {
  var index = $(`#${parentContainerId} .aggregation_form_element`).index(formDiv)
  return index
}
/** Get a list of all the parents and their children
* + mutate names if oldName/newName specified
*/
function getAggFormNameParents_(parentJson, oldName, newName) {
  var fieldList = [ 'buckets', 'metrics', 'pipelines' ]
  var retVal = {}
  fieldList.forEach(function(aggType) {
    var path = [ "aggregation_table", aggType ]
    var jsonArray = Util.getJson(parentJson, path) || []
    jsonArray.forEach(function(json) {
      // If old and new names specified, then mutate names
      if (oldName && (oldName == json.location)) {
        json.location = newName
      }
      var location = json.location || "automatic"
      var currArray = retVal[location] || []
      retVal[location] = currArray
      currArray.push(json.name)
    })
  })
  return retVal
}

/** Get all the metric/bucket fieldnames */
function getAggFormNameMap_(parentJson, indexExclude, typeExclude) {
  var fieldList = [ 'buckets', 'metrics', 'pipelines' ]
  var fieldPathToExcludeStr = getAggFormPath_(typeExclude).toString()
  var retVal = {}
  fieldList.forEach(function(aggType) {
    var path = [ "aggregation_table", aggType ]
    var pathStr = path.toString()
    var jsonArray = Util.getJson(parentJson, path) || []
    jsonArray.forEach(function(json, ii) {
      if ((indexExclude != ii) || (fieldPathToExcludeStr != pathStr)) {
        if (json.name) retVal[json.name] = true
      }
    })
  })
  // don't allow autoamtic/diabled/__root__ to avoid complexity
  retVal["automatic"] = true
  retVal["disabled"] = true
  retVal["__root__"] = true
  return retVal
}

return {
  build: build
}
}())
