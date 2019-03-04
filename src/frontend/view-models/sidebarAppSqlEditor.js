var SqlEditor = (function(){
  /** Builds the forms that define the generation of SQL generation */
  function buildHtmlStr(index) {

    var accordion =
    `
    <div id="accordion_sql_${index}" class="panel-group">
    <div class="panel panel-default">
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_sql_${index}" href="#accordion_general_sql_${index}">General</a>
    </h4>
    </div>
    <div id="accordion_general_sql_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${GeneralEditor.buildHtmlStr(index, 'sql')}
    </div>
    </div>
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_sql_${index}" href="#accordion_edit_sql_${index}">SQL</a>
    </h4>
    </div>
    <div id="accordion_edit_sql_${index}" class="panel-collapse collapse in">
    <div class="panel-body">
    <div id="editor_sql_${index}"></div>
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
      var sql = Util.getOrPutJsonObj(currJson, [ "sql_table" ])
      sql.enabled = selected
    })
    // Display redraw:
    if (selected) {
      ace.edit(`editor_sql_${index}`).resize()
    }
  }

  /** Populate the data for this form */
  function populate(index, name, json, sqlEditor) {
    var sqlEditor = sqlEditor || ace.edit(`editor_sql_${index}`)
    GeneralEditor.populate(index, name, json, 'sql')
    var sql = Util.getJson(json, [ "sql_table", "query" ]) || ""
    sqlEditor.session.setValue(sql)
  }

  /** Called once all the HTML elements for this SQL table exist, populates the data and registers event handlers */
  function register(index, name, json, globalEditor) {

    // Build SQL editor
    var sqlEditor = ace.edit(`editor_sql_${index}`)
    sqlEditor.session.setMode("ace/mode/sql")
    sqlEditor.session.setTabSize(3)
    sqlEditor.session.setUseWrapMode(true)

    populate(index, name, json, sqlEditor) //(before we register the handlers - note calls GeneralEditor.populate)

    // General handlers

    GeneralEditor.register(index, name, json, globalEditor, 'sql')

    // SQL specific handlers:

    $(`#accordion_edit_sql_${index}`).on('shown.bs.collapse', function () {
      onSelect(index, /*selected*/ true, globalEditor) //(ensures all the elements are redrawn as we change the display settings)
    })

    sqlEditor.session.on('change', function(delta) {
      Util.updateRawJson(globalEditor, function(currJson) {
        var sql = Util.getOrPutJsonObj(currJson, [ "sql_table" ])
        sql.query = sqlEditor.session.getValue()
      })
    });
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    register: register
  }

}())
