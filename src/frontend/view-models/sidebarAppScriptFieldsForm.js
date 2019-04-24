var ScriptFieldsForm = (function(){
  var scriptFieldFormOneUp_ = 0 //global across all indices - not an index just a uuid

  /** Builds the UI element that manages data tables (tableType one of `data_table`, `aggergation_table` */
  function build(index, indexPatternId, tableType, globalEditor, parentContainerId, json) {
    var subIndex = ++scriptFieldFormOneUp_

    var isJsonCollapsed = json ? "" : "in" // (collapse the JSON if populating from existing data)
    var isNewElement = json ? false : true

    var json = json || { name: "FIELD" + subIndex }

    var elementIdSuffix = `ScriptFieldsForm_${index}_${subIndex}`

    // Handle name editing:
    var disabledNameEditor = isNewElement ?
    ""
    :
    disabledNameEditor = "readonly"

    var form =
    `
    <div class="form aggregation_form_element" id="form_${elementIdSuffix}">
    <div class="form-group">

    <div class="btn-toolbar">
    <div class="btn-group">
    <button id="toggle_config_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Show/hide painless config">
    <a data-toggle="collapse" href="#collapse0_${elementIdSuffix}"><span class='glyphicon glyphicon-wrench'></span></a>
    <!-- TODO: after a move this no longer works until the wrench of _another_ element is pressed (+doesn't seem to work first time?)
    This is probably: https://github.com/twbs/bootstrap/issues/2274 (suggestion: go with jquery show/hide?)
    -->
    </button>
    </div>
    <div class="btn-group">
    <button id="move_up_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Move field up"><span class='glyphicon glyphicon-menu-up'></span></button>
    <button id="move_down_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Move field down"><span class='glyphicon glyphicon-menu-down'></span></button>
    </div>
    <div class="btn-group">
    <button id="delete_${elementIdSuffix}" class="btn btn-xs btn-default" type="button" data-toggle="tooltip" title="Delete field"><span class='glyphicon glyphicon-remove-sign'></span></button>
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

    <div id="collapse0_${elementIdSuffix}" class="panel-collapse collapse ${isJsonCollapsed}">

    <div id="editor_${elementIdSuffix}" class="medium_ace_editor">
    </div>

    <div class="panel-group">
    <div class="panel panel-default">
    <label>
    <a data-toggle="collapse" href="#collapse1_${elementIdSuffix}">Advanced</a>
    </label>
    <div id="collapse1_${elementIdSuffix}" class="panel-collapse collapse">
    <div id="params_${elementIdSuffix}" class="small_ace_editor">
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
        var insertPath = getScriptFieldFormPath_(tableType)
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          var arrayToAppend = Util.getOrPutJsonArray(currJson, insertPath)
          arrayToAppend.push(json)
        })
      }

      // Build JSON editor
      var formEditor = ace.edit(`editor_${elementIdSuffix}`)
      formEditor.session.setMode("ace/mode/java")
      formEditor.session.setTabSize(3)
      formEditor.session.setUseWrapMode(true)
      var defaultCode = "// Use doc and params, return the field value"
      formEditor.session.setValue(json.script || defaultCode)
      formEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      formEditor.completers = [
        AutocompletionManager.dataFieldCompleter(indexPatternId, "painless"),
        AutocompletionManager.painlessCompleter(TableManager.getTableId(index), "script_fields")
      ]

      var paramsEditor = ace.edit(`params_${elementIdSuffix}`)
      paramsEditor.session.setMode("ace/mode/json")
      paramsEditor.session.setTabSize(3)
      paramsEditor.session.setUseWrapMode(true)
      paramsEditor.session.setValue(JSON.stringify(json.params || {}, null, 3))
      paramsEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      paramsEditor.completers = [
        AutocompletionManager.paramsCompleter
      ]

      // Handle the control buttons
      $(`#move_up_${elementIdSuffix}`).click(function(){
        var subIndex = getCurrScriptFieldFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          moveCurrScriptFieldFormJson_(subIndex, -1, tableType, currJson)
        })
        var prev = $(`#form_${elementIdSuffix}`).prev()
        $(`#form_${elementIdSuffix}`).insertBefore(prev)
      })
      $(`#move_down_${elementIdSuffix}`).click(function(){
        var subIndex = getCurrScriptFieldFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          moveCurrScriptFieldFormJson_(subIndex, +1, tableType, currJson)
        })
        var next = $(`#form_${elementIdSuffix}`).next()
        $(`#form_${elementIdSuffix}`).insertAfter(next)
      })
      $(`#delete_${elementIdSuffix}`).click(function(){
        var deleteScript = function() {
          Util.updateRawJsonNow(globalEditor, function(currJson) {
            var subIndex = getCurrScriptFieldFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
            deleteCurrScriptFieldFormJson_(subIndex, tableType, currJson)
          })
          $(`#form_${elementIdSuffix}`).remove()
        }
        if (TableManager.isStandalone()) {
          if (confirm("Are you sure you want to delete this script field? Click OK to proceed")) {
            deleteScript()
          }
        } else {
          Util.launchYesNoPrompt(
            "Delete script field", "Are you sure you want to delete this script field?",
            deleteScript
          )
        }
      })

      // Other change handlers:

      // Painless editor

      formEditor.session.on('change', function(delta) {
        Util.updateRawJson(globalEditor, function(currJson) {
          var currJsonForm = getCurrScriptFieldFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, tableType, currJson)
          try {
            currJsonForm.script = formEditor.session.getValue()
          } catch (err) {} //(do nothing if it's not valid JSON)
        })
      })
      // Painless parameters
      paramsEditor.session.on('change', function(delta) {
        Util.updateRawJson(globalEditor, function(currJson) {
          var currJsonForm = getCurrScriptFieldFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, tableType, currJson)
          try {
            currJsonForm.params = JSON.parse(paramsEditor.session.getValue())
          } catch (err) {} //(do nothing if it's not valid JSON)
        })
      })

      // Name
      var onNameChange = function(thisValue, alwaysReturnTrue) {
        $(`#name_${elementIdSuffix}`).prop('readonly', function(i, isReadonly) {
          if (!isReadonly && thisValue) {
            var subIndex = getCurrScriptFieldFormJsonIndex_($(`#form_${elementIdSuffix}`), parentContainerId)
            Util.updateRawJsonNow(globalEditor, function(currJson) {
              // Ensure all names are unique:
              var nameMap = getScriptFieldFormNameMap_(tableType, currJson, subIndex, tableType)
              for (var i = 0; ; i++) {
                if (nameMap[thisValue]) { // this name exists, so change it
                  thisValue = thisValue + i
                  $(`#name_${elementIdSuffix}`).val(thisValue)
                } else {
                  break
                }
              }
              var currJsonForm = getCurrScriptFieldFormJson_($(`#form_${elementIdSuffix}`), parentContainerId, tableType, currJson)
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

      // Fix code editor bugs (TODO also do this for metrics?)
      $(`#collapse0_${elementIdSuffix}`).on('shown.bs.collapse', function () {
        ace.edit(`editor_${elementIdSuffix}`).resize()
      })
      $(`#collapse1_${elementIdSuffix}`).on('shown.bs.collapse', function () {
        ace.edit(`params_${elementIdSuffix}`).resize()
      })
    })
  }

  /** Handy utility for pointing at the right table field array */
  function getScriptFieldFormPath_(tableType) {
    return [ tableType, "script_fields" ]
  }
  /** Removes the JSON element at the specified index */
  function deleteCurrScriptFieldFormJson_(subIndex, tableType, parentJson) {
    var jsonArray = Util.getOrPutJsonArray(parentJson, getScriptFieldFormPath_(tableType))
    jsonArray.splice(subIndex, 1)
  }
  /** Moves the JSON element at the specified index */
  function moveCurrScriptFieldFormJson_(subIndex, offset, tableType, parentJson) {
    var jsonArray = Util.getOrPutJsonArray(parentJson, getScriptFieldFormPath_(tableType))
    var newIndex = subIndex + offset
    if (newIndex < 0) {
      newIndex = 0
    } else if (newIndex >= jsonArray.length) {
      newIndex = jsonArray.length - 1
    }
    jsonArray.splice(newIndex, 0, jsonArray.splice(subIndex, 1)[0])
  }
  /** Returns the JSON element at the specified index */
  function getCurrScriptFieldFormJson_(formDiv, parentContainerId, tableType, parentJson) {
    var index = getCurrScriptFieldFormJsonIndex_(formDiv, parentContainerId)
    var jsonArray = Util.getJson(parentJson, getScriptFieldFormPath_(tableType)) || []
    return jsonArray[index]
  }
  /** Returns the index of the specified form */
  function getCurrScriptFieldFormJsonIndex_(formDiv, parentContainerId) {
    var index = $(`#${parentContainerId} .aggregation_form_element`).index(formDiv)
    return index
  }
  /** Get all the fieldnames */
  function getScriptFieldFormNameMap_(tableType, parentJson, indexExclude, typeExclude) {
    var fieldPathToExcludeStr = getScriptFieldFormPath_(typeExclude).toString()
    var retVal = {}

    var path = getScriptFieldFormPath_(tableType)
    var pathStr = path.toString()
    var jsonArray = Util.getJson(parentJson, path) || []
    jsonArray.forEach(function(json, ii) {
      if ((indexExclude != ii) || (fieldPathToExcludeStr != pathStr)) {
        if (json.name) retVal[json.name] = true
      }
    })
    return retVal
  }

  return {
    build: build
  }
}())
