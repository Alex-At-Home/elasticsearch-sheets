var ManagementEditor = (function(){
  /** Builds the forms that define the generation of cat generation */
  function buildHtmlStr(index) {

    var accordion =
    `
    <div id="accordion_mgmt_${index}" class="panel-group">
    <div class="panel panel-default">
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_mgmt_${index}" href="#accordion_general_mgmt_${index}">General</a>
    </h4>
    </div>
    <div id="accordion_general_mgmt_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${GeneralEditor.buildHtmlStr(index, 'mgmt')}
    </div>
    </div>
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_mgmt_${index}" href="#accordion_fields_mgmt_${index}">Fields</a>
    </h4>
    </div>
    <div id="accordion_fields_mgmt_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${FieldsEditor.buildHtmlStr(index, 'mgmt')}
    </div>
    </div>
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_mgmt_${index}" href="#accordion_edit_mgmt_${index}">Management</a>
    </h4>
    </div>
    <div id="accordion_edit_mgmt_${index}" class="panel-collapse collapse in">
    <div class="panel-body">
    <div class="form-group">
    <div class="input-group">
    <div class="input-group-addon">
    <span class="input-group-text">_cat/</span>
    </div>
    <input type="text" class="form-control" placeholder="" value="" id="endpoint_mgmt_${index}">
    </div>
    </div>
    <div class="form-group">
    <label for="options_mgmt_${index}">Options (one per line)</label>
    <textarea class="form-control vertical-resize-only" rows="5" id="options_mgmt_${index}"></textarea>
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
      var cat = Util.getOrPutJsonObj(currJson, [ "cat_table" ])
      cat.enabled = selected
    })
    FieldsEditor.onSelect(index, selected, globalEditor, 'mgmt')
  }

  /** Populate the data for this form */
  function populate(index, name, json, globalEditor) {
    GeneralEditor.populate(index, name, json, 'mgmt')
    FieldsEditor.populate(index, name, json, globalEditor, 'mgmt')

    var cat = Util.getJson(json, [ "cat_table" ]) || {}
    $(`#endpoint_mgmt_${index}`).val(cat.endpoint || "")
    $(`#options_mgmt_${index}`).val((cat.options || []).join("\n"))
  }

  var listOfCatOptions = [
    "recovery", "indices", "shards", "nodes", "snapshots"
  ]

  /** Called once all the HTML elements for this Management table exist, populates the data and registers event handlers */
  function register(index, name, json, globalEditor) {

    populate(index, name, json) //(before we register the handlers - note calls GeneralEditor.populate)

    // General handlers

    GeneralEditor.register(index, name, json, globalEditor, 'mgmt')
    FieldsEditor.register(index, name, json, globalEditor, 'mgmt')

    // Management specific handlers:

    //(ensures all the elements are redrawn as we change the display settings)
    $(`#accordion_edit_mgmt_${index}`).on('shown.bs.collapse', function () {
      onSelect(index, /*selected*/ true, globalEditor)
    })
    $(`#accordion_fields_mgmt_${index}`).on('shown.bs.collapse', function () {
      FieldsEditor.onSelect(index, /*selected*/ true, globalEditor, 'mgmt')
    })

    $(`#options_mgmt_${index}`).on('input', function() {
      var options = $(this).val().split("\n").map(function(x) { return x.trim() }).filter(function(x) { return x != "" })
      Util.updateRawJson(globalEditor, function(currJson) {
        var cat = Util.getOrPutJsonObj(currJson, [ "cat_table" ])
        cat.options = options
      })
    })

    $(`#endpoint_mgmt_${index}`).autocomplete({
      minLength: 0,
      source: function(request, response) {
        var data = $.grep(listOfCatOptions, function(value) {
          return value.substring(0, request.term.length).toLowerCase() == request.term.toLowerCase()
        });
        response(data)
      },
      change: function( event, ui ) {
        var endpoint = $(`#endpoint_mgmt_${index}`).val()
        Util.updateRawJson(globalEditor, function(currJson) {
          var cat = Util.getOrPutJsonObj(currJson, [ "cat_table" ])
          cat.endpoint = endpoint
        })
      }
    }).focus(function () {
      if ("" == $(this).val()) { // only insta-display options if textbox empty
        $(this).autocomplete("search", "")
      }
    })
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    onSelect: onSelect,
    register: register
  }

}())
