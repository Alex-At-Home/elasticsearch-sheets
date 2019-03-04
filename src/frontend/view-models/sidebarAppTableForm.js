var TableForm = (function() {

  /** Builds the UI element that manages data tables*/
  function buildAccordionElement(index, name, json, isFirstElement, standaloneEdit) {
    if (!isFirstElement && !TableManager.validateName(name)) {
      Util.showStatus("Bad name: [" + name + "], can't contain [<>'\"]", "Client Error")
      return
    }

    // Manage global state:
    var tableName = isFirstElement ? "" : name
    if (isFirstElement) {
      TableListManager.onTableEntryAdded(defaultKey, json)
    } else {
      TableListManager.onTableEntryAdded(name, json)
    }

    // Now we've stashed the saved entries, handle any temp copies
    var savedJson = json //(for cancel/reset)
    var tmp = json.temp
    var isSelectedOnLoad =
      (name == selectedTable) || (isFirstElement && (selectedTable == defaultKey))

    if (tmp) {
      tableName = tmp.name || name
      json = tmp
    }
    delete json.temp

    // Append to accordion

    var buttons = ""
    var tableTools = ""
    var tableToolsEnabled = ""
    var tableToolsFullOptions = ""
    var tableToolsStyle = "style='padding-top: 6px;'"
    var nameEditor = ""
    var nameEditorIcon = ""
    var disabledNameEditor = ""
    if (!standaloneEdit) {
      if (isFirstElement) {
        buttons =
        `
        <div class="btn-toolbar">
        <button id="create_${index}" type="button" class="btn btn-primary accordion_button">Create</button>
        <button id="test_${index}" type="button" class="btn btn-info accordion_button">Test</button>
        <button id="cancel_${index}" type="button" class="btn btn-warning accordion_button">Cancel</button>
        </div>
        `
        var tableToolsEnabled = "disabled"

      } else {
        buttons =
        `
        <div class="btn-toolbar">
        <button id="update_${index}" type="button" class="btn btn-primary accordion_button">Update</button>
        <button id="reset_${index}" type="button" class="btn btn-warning accordion_button">Reset</button>
        <button id="delete_${index}" type="button" class="btn btn-danger accordion_button">Delete</button>
        </div>
        `

        nameEditorIcon =
        `
        <span class="input-group-btn">
        <button id="editname_${index}" class="btn btn-default" type="button" data-toggle="tooltip" title="Edit name"><span class='glyphicon glyphicon-pencil'></span></button>
        </span>
        `

        tableToolsFullOptions =
        `
        <li><a class="dropdown-item" id="move_${index}">Show/Move/Resize Range</a></li>
        <li><a class="dropdown-item" id="query_${index}">Refresh Table</a></li>
        `
        disabledNameEditor = "readonly"
      }//(endif isFirstElement)

      tableTools =
      `
      <div class="btn-group pull-right no-padding" role="group">
      <div class="dropdown">
      <button class="btn btn-default btn-sm dropdown-toggle" type="button" id="dropdown_${index}" data-toggle="dropdown" ${tableToolsEnabled}>
      <span class="caret"></span>
      </button>
      <div class="dropdown-menu" role="menu" style="right:0;left: auto;">
      ${tableToolsFullOptions}
      <li><a class="dropdown-item" id="expand_${index}">Expand Editor</a></li>
      <li><a class="dropdown-item" id="viewquery_${index}">View Query</a></li>
      </div>
      </div>
      </div>
      `

      var nameEditor =
      `
      <div class="form-group"><div class="input-group">
      <div class="input-group-addon">
      <span class="input-group-text" id="basic-addon${index}">Name</span>
      </div>
      <input type="text" id="name_${index}" class="form-control" placeholder="Table Name" aria-describedby="basic-addon${index}" value="${tableName}" ${disabledNameEditor}>
      ${nameEditorIcon}
      </div> </div>
      `
    }//(endif standaloneEdit)

    var panelHeader = ''
    var panelInOrOut = 'in'
    if (!standaloneEdit) {
      panelHeader = `
      <div class="panel-heading clearfix">
      ${tableTools}
      <h4 class="panel-title" ${tableToolsStyle}>
      <a id="toggleCollapse${index}" data-parent="#accordion"><b>${name}</b></a>
      </h4>
      </div>
      `
      panelInOrOut = 'out'
    }
    var page =
    `<div id="accordion_${index}" class="panel panel-default table_form_element">
    ${panelHeader}
    <div id="collapse${index}" class="panel-collapse collapse ${panelInOrOut}">
    <div class="panel-body form-horizontal">
    <div class="form-group">
    ${buttons}
    </div>
    ${nameEditor}
    <div class="form-group">
    <select class="input-small form-control" id="type_${index}">
    <option disabled selected value="tabs_unknown_${index}">(Choose type)</option>
    <!--
    <option value="tabs_unknown_${index}">Data</option>
    -->
    <option value="tabs_agg_${index}">Aggregation/Map Reduce</option>
    <option value="tabs_sql_${index}">SQL (requires license)</option>
    <option value="tabs_mgmt_${index}">Management</option>
    <option value="tabs_json_${index}">Advanced (raw JSON)</option>
    </select>
    </div>
    <!-- The different data tables' definitions -->
    <div class="tab-content" id="tabs_${index}">
    <div class="tab-pane form-group" id="tabs_unknown_${index}">
    </div>
    <div class="tab-pane form-group" id="tabs_agg_${index}">
    ${buildAggregationEditor(index, standaloneEdit)}
    </div>
    <div class="tab-pane form-group" id="tabs_sql_${index}">
    ${buildSqlEditor(index)}
    </div>
    <div class="tab-pane form-group" id="tabs_mgmt_${index}">
    ${buildManagementEditor(index)}
    </div>
    <div class="tab-pane form-group" id="tabs_json_${index}">
    <div id="editor_${index}"></div>
    </div>
    </div>
    </div>
    </div>
    </div>`

    $("#accordion").append(page).append(function(){ // When complete

      // Build raw JSON editor

      var globalEditor = ace.edit(`editor_${index}`)
      globalEditor.session.setMode("ace/mode/json")
      globalEditor.session.setTabSize(3)
      globalEditor.session.setUseWrapMode(true)
      globalEditor.session.setValue(JSON.stringify(json, null, 3))

      // Register all the "child" event handlers
      // Add the index to all fields
      //TODO: currently unused i think, should maybe remove?
      $(`#accordion_${index}`).each(function() {
        $(this).data("accordion_index", index)
        //(retrived from handler by $(this).data("accordion_index")
      })

      // Add table selection handler

      var onTableSelection = function(tab) {
          $(`#tabs_${index} .tab-pane`).removeClass('active')
          $(`#${tab}`).addClass('active')

          if (tab == `tabs_json_${index}`) {
            ace.edit(`editor_${index}`).resize()
          } else { //(group all the "non raw" editors together)

          // (If first element, enable the extra options)
          if (isFirstElement) {
            $(`#dropdown_${index}`).removeAttr('disabled')
          }

          // Update which table we're using and perform any required redraw logic:
          //TODO - refactor to be a single call
          onSelectSqlEditor(index, tab == `tabs_sql_${index}`, globalEditor)
          onSelectManagementEditor(index, tab == `tabs_mgmt_${index}`, globalEditor)
          onSelectAggregationEditor(index, tab == `tabs_agg_${index}`, globalEditor)
        }
      }

      $(`#type_${index}`).on('change', function () {
        var tab = $(this).val()
        onTableSelection(tab)
      })

      //TODO - refactor to be a single call
      registerAggregationEditor(index, name, json, globalEditor)
      registerSqlEditor(index, name, json, globalEditor)
      registerManagementEditor(index, name, json, globalEditor)

      // Add collapse toggle handler and/or initialize the table's starting value:

      var tableToTypeMap = {
        sql_table: `tabs_sql_${index}`,
        data_table: `tabs_unknown_${index}`,
        aggregation_table: `tabs_agg_${index}`,
        cat_table: `tabs_mgmt_${index}`,
        json_table: `tabs_json_${index}`
      }
      var selectTableType = function() {
        var typeToActivate = ""
        for (var typeKey in tableToTypeMap) {
          var isThisType = Util.getJson(json, [ typeKey, "enabled" ])
          if (isThisType) {
            typeToActivate = tableToTypeMap[typeKey] || ""
          }
        }
        if (typeToActivate != "") {
          $(`#type_${index}`).val(typeToActivate)
          onTableSelection(typeToActivate)
        }
      }

      if (isSelectedOnLoad) {
        $(`#collapse${index}`).collapse('toggle')
        selectTableType()
      }
      if (!standaloneEdit) { // Add handler
        $(`#toggleCollapse${index}`).click(function(){
          $(`#collapse${index}`).collapse('toggle')

          // Activate the right type
          if (!isFirstElement) {
            selectTableType()
          }
        })

      } else { //(no handler, just set on startup
        selectTableType()
      }

      // Register event handler on raw JSON
      globalEditor.session.on('change', function(delta) {
        Util.safeChangeGlobalJson(globalEditor, function(newJson) {
          //TODO - refactor to be a single call
          populateAggregationEditor(index, name, newJson, globalEditor)
          populateSqlEditor(index, name, newJson, null)
          populateManagementEditor(index, name, newJson, null)
        })
      })

      // Add button handlers

      if (!standaloneEdit) {

        // Common top button bar:

        $(`#expand_${index}`).click(function(){
          var newName = $(`#name_${index}`).val() || "(no name)"
          var jsonStr = globalEditor.session.getValue()
          TableManager.launchJsonEditor(isFirstElement ? defaultKey : name, newName, JSON.parse(jsonStr))
        })

        $(`#viewquery_${index}`).click(function(){
          var newName = $(`#name_${index}`).val() || "(no name)"
          var jsonStr = globalEditor.session.getValue()
          var jsonBody = JSON.parse(jsonStr) //(throws if not valid JSON)
          ElasticsearchManager.populateTable(newName, jsonBody, /*testMode*/true)
        })

        if (isFirstElement) { //create, cancel

          // Action buttons

          $(`#create_${index}`).click(function(){
            var newName = $(`#name_${index}`).val()
            if (!TableManager.validateName(newName)) {
              Util.showStatus("New table name must be non-empty and valid", 'Client Error')
            } else {
              var jsonStr = globalEditor.session.getValue()
              TableManager.onCreateTable(newName, jsonStr)
            }
          })
          $(`#test_${index}`).click(function(){
            var jsonStr = globalEditor.session.getValue()
            var jsonBody = JSON.parse(jsonStr) //(throws if not valid JSON)
            ElasticsearchManager.populateTable(name, jsonBody)
          })
          $(`#cancel_${index}`).click(function(){
            $(`#name_${index}`).val("")
            $(`#type_${index}`).val(`tabs_unknown_${index}`).change()
            globalEditor.session.setValue(JSON.stringify(savedJson, null, 3))
            $(`#dropdown_${index}`).attr('disabled', true)
            TableManager.clearTempConfig(defaultKey)
          })
        } else { // query, move - edit name - update, reset, delete

          // Top button bar

          $(`#move_${index}`).click(function(){
            TableManager.showTableRangeManager(name)
          })

          $(`#query_${index}`).click(function(){
            var jsonStr = globalEditor.session.getValue()
            var jsonBody = JSON.parse(jsonStr) //(throws if not valid JSON)
            ElasticsearchManager.populateTable(name, jsonBody, /*testMode*/false)
          })

          // Name editing

          $(`#editname_${index}`).on('mousedown', function(){
            $(`#name_${index}`).prop('readonly', function(i, v) { return !v; });
          });
          if ($(`#editname_${index}`).length) { //name is in edit mode
            // Also support focusout
            $(`#name_${index}`).on('focusout', function(){
              $(`#name_${index}`).prop('readonly', true)
            })
          }

          // Action buttons

          $(`#delete_${index}`).click(function(){
            TableManager.onDeleteTable(name, index)
          })
          $(`#reset_${index}`).click(function(){
            $(`#name_${index}`).val(name)
            globalEditor.session.setValue(JSON.stringify(savedJson, null, 3))
            TableManager.clearTempConfig(name)
          })
          $(`#update_${index}`).click(function(){
            var newName = $(`#name_${index}`).val()
            var jsonStr = globalEditor.session.getValue()
            TableManager.onUpdateTable(newName, name, jsonStr, index)
          })
        }
      }
    })
  }

  return {
    buildAccordionElement: buildAccordionElement
  }

}())