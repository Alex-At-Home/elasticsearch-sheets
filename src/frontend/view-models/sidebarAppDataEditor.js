var DataEditor = (function(){
  /** Builds the forms that define the generation of SQL generation */
  function buildHtmlStr(index) {

    //TODO have a script field UI element (also for aggregation)

    var accordion =
    `
    <div id="accordion_data_${index}" class="panel-group">
    <div class="panel panel-default">

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_data_${index}" href="#accordion_general_data_${index}">General layout</a>
    </h4>
    </div>

    <div id="accordion_general_data_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${GeneralEditor.buildHtmlStr(index, 'data')}
    </div>
    </div>
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_data_${index}" href="#accordion_fields_data_${index}">Field formatting</a>
    </h4>
    </div>
    <div id="accordion_fields_data_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${FieldsEditor.buildHtmlStr(index, 'data')}
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_data_${index}" href="#accordion_query_data_${index}">Query</a>
    </h4>
    </div>

    <div id="accordion_query_data_${index}" class="panel-collapse collapse in">
    <div class="panel-body">
    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Indices</span>
    </div>
    <input type="text" class="form-control" placeholder="Index Pattern" value="" id="index_data_${index}">
    </div>
    <div id="query_data_${index}" class="medium_ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_data_${index}" href="#accordion_script_fields_data_${index}">Script Fields</a>
    </h4>
    </div>

    <div id="accordion_script_fields_data_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="script_fields_data_${index}"></div>
    <div class="btn-toolbar">
    <button class="btn btn-default" id="add_script_field_data_${index}">Add Scripted Field</button>
    </div>
    </div>
    </div>

    </div>
    </div>
    `
    return accordion
  }

  /** Handles elements that need custom redraw logic if the underlying fields were changed */
  function onSelect(index, selected, globalEditor) {
    // Update top-level JSON since we're switching mode
    Util.updateRawJsonNow(globalEditor, function(currJson) {
      var data = Util.getOrPutJsonObj(currJson, [ "data_table" ])
      data.enabled = selected
    })
    FieldsEditor.onSelect(index, selected, globalEditor, 'data')
    // Display redraw:
    if (selected) {
      ace.edit(`query_data_${index}`).resize()
    }
  }

  /** Populate the data for this form */
  function populate(index, name, json, globalEditor) {
    var queryEditor = ace.edit(`query_data_${index}`)

    GeneralEditor.populate(index, name, json, 'data')
    FieldsEditor.populate(index, name, json, globalEditor, 'data')

    // Index:
    var indexPattern = Util.getJson(json, [ "data_table", "index_pattern" ]) || ""
    $(`#index_data_${index}`).val(indexPattern)

    var query = JSON.stringify(Util.getJson(json, [ "data_table", "query" ]) || {}, null, 3)
    queryEditor.session.setValue(query)

    // Clear any existing script fields and rebuild
    $(`#script_fields_data_${index}`).empty()
    var scriptFields = Util.getJson(json, [ "data_table", "script_fields" ]) || []
    scriptFields.forEach(function(scriptField) {
      ScriptFieldsForm.build(index, `index_data_${index}`, 'data_table', globalEditor, `script_fields_data_${index}`, scriptField)
    })

  }

  /** Called once all the HTML elements for this SQL table exist, populates the data and registers event handlers */
  function register(index, name, json, globalEditor) {

    // Build SQL editor
    var queryEditor = ace.edit(`query_data_${index}`)
    queryEditor.session.setMode("ace/mode/json")
    queryEditor.session.setTabSize(3)
    queryEditor.session.setUseWrapMode(true)

    // Autocompletion
    queryEditor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    })
    queryEditor.completers = [
      AutocompletionManager.dataFieldCompleter(`index_data_${index}`, "raw"),
      AutocompletionManager.paramsCompleter,
      AutocompletionManager.queryCompleter,
      AutocompletionManager.queryInsertionCompleter,
      AutocompletionManager.scriptFieldsCompleter(TableManager.getTableId(index), "labels")
    ]

    populate(index, name, json, globalEditor) //(before we register the handlers - note calls GeneralEditor.populate)

    // General handlers

    GeneralEditor.register(index, name, json, globalEditor, 'data')
    FieldsEditor.register(index, name, json, globalEditor, 'data')

    // Data specific handlers:

    function onIndexChange(thisValue) {
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var dataTable = Util.getOrPutJsonObj(currJson, [ "data_table" ])
        dataTable.index_pattern = thisValue
      })
    }

    $(`#index_data_${index}`)
      .on("focusout", function(e) {
        AutocompletionManager.registerIndexPattern(`index_data_${index}`, TableManager.getTableId(index))
      })
      .autocomplete(AutocompletionManager.getIndexCompleter(onIndexChange))
      .focus(function () {
        if ("" == $(this).val()) { // only insta-display options if textbox empty
          $(this).autocomplete("search", "")
        }
      })
    //(also initialize this on build)
    AutocompletionManager.registerIndexPattern(`index_data_${index}`, TableManager.getTableId(index))

    //(ensures all the elements are redrawn as we change the display settings)
    $(`#accordion_query_data_${index}`).on('shown.bs.collapse', function () {
      onSelect(index, /*selected*/ true, globalEditor)
    })
    $(`#accordion_fields_data_${index}`).on('shown.bs.collapse', function () {
      FieldsEditor.onSelect(index, /*selected*/ true, globalEditor, 'data')
    })

    queryEditor.session.on('change', function(delta) {
      Util.updateRawJson(globalEditor, function(currJson) {
        var data = Util.getOrPutJsonObj(currJson, [ "data_table" ])
        try {
          data.query = JSON.parse(queryEditor.session.getValue())
        } catch (err) {}
      })
    });

    // Script fields:
    $(`#add_script_field_data_${index}`).click(function(){
      ScriptFieldsForm.build(index, `index_data_${index}`, 'data_table', globalEditor, `script_fields_data_${index}`)
    })
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    onSelect: onSelect,
    register: register
  }

}())
