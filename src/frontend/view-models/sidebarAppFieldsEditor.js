var FieldsEditor = (function() {

  /** Build the HTML for the fields editor for this table */
  function buildHtmlStr(index, tableType) {

    var checkbox = ('mgmt' == tableType) ? "" :
    `
    <div class="checkbox">
      <label><input type="checkbox" id="exclude_${tableType}_${index}">Exclude from autocompletion</label>
    </div>
    `

    var form =
    `
    <form>
    <div class="form-group">
      <label>Field selection and ordering</label>
      <div class="medium_ace_editor" id="field_filter_${tableType}_${index}"></div>
      ${checkbox}
      <label>Field aliases</label>
      <div class="medium_ace_editor" id="field_aliases_${tableType}_${index}"></div>
    </div>
    </form>
    `
    return form
  }
  /** Called from the table types' "populate", populates the common model from the JSON */
  function populate(index, name, json, globalEditor, tableType) {
    var filterEditorId = `field_filter_${tableType}_${index}`
    var currFilterEditor = ace.edit(filterEditorId)
    var fieldFilters = Util.getJson(json, [ "common", "headers", "field_filters" ]) || []
    currFilterEditor.session.setValue(fieldFilters.join("\n"))

    var aliasEditorId = `field_aliases_${tableType}_${index}`
    var currAliasEditor = ace.edit(aliasEditorId)
    var fieldAliases = Util.getJson(json, [ "common", "headers", "field_aliases" ]) || []
    currAliasEditor.session.setValue(fieldAliases.join("\n"))

    if ('mgmt' != tableType) {
      var excludeFilteredFields =
        Util.getJson(json, [ "common", "headers", "exclude_filtered_fields_from_autocomplete" ]) || false

      $(`#exclude_${tableType}_${index}`).prop('checked', excludeFilteredFields)

      AutocompletionManager.registerFilterList(getFilterId(index), fieldFilters)
    }
  }

  /** Handles elements that need custom redraw logic if the underlying fields were changed */
  function onSelect(index, selected, globalEditor, tableType) {
    if (selected) {
      var filterEditorId = `field_filter_${tableType}_${index}`
      var currFilterEditor = ace.edit(filterEditorId)
      currFilterEditor.resize()

      var aliasEditorId = `field_aliases_${tableType}_${index}`
      var currAliasEditor = ace.edit(aliasEditorId)
      currAliasEditor.resize()
    }
  }

  /** Called from the table types' "register", Adds event handlers to all the common elements */
  function register(index, name, json, globalEditor, tableType) {

    var filterEditorId = `field_filter_${tableType}_${index}`
    var currFilterEditor = ace.edit(filterEditorId)
    currFilterEditor.session.setTabSize(3)
    currFilterEditor.session.setUseWrapMode(true)
    currFilterEditor.session.setMode("ace/mode/ini")
    if ('mgmt' != tableType) {
      currFilterEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      currFilterEditor.completers = [
        AutocompletionManager.dataFieldCompleter(`index_${tableType}_${index}`, "raw"),
      ]
    }

    var aliasEditorId = `field_aliases_${tableType}_${index}`
    var currAliasEditor = ace.edit(aliasEditorId)
    currAliasEditor.session.setTabSize(3)
    currAliasEditor.session.setUseWrapMode(true)
    currAliasEditor.session.setMode("ace/mode/ini")
    if ('mgmt' != tableType) {
      currAliasEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      currAliasEditor.completers = [
        AutocompletionManager.dataFieldCompleter(`index_${tableType}_${index}`, "raw"),
      ]
    }

    // Populate all the fields:
    populate(index, name, json, globalEditor, tableType)

    // Register events

    currFilterEditor.session.on('change', function(delta) {
      Util.updateRawJson(globalEditor, function(currJson) {
        var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
        var currText = currFilterEditor.session.getValue()
        var fieldFilters = currText.split("\n")
        headers.field_filters = fieldFilters
        if ('mgmt' != tableType) {
          AutocompletionManager.registerFilterList(getFilterId(index), fieldFilters)
        }
      })
    })
    currAliasEditor.session.on('change', function(delta) {
      Util.updateRawJson(globalEditor, function(currJson) {
        var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
        var currText = currAliasEditor.session.getValue()
        var fieldAliases = currText.split("\n")
        headers.field_aliases = fieldAliases
      })
    })

    if ('mgmt' != tableType) {
      $(`#exclude_${tableType}_${index}`).change(function() {
        var thisChecked = this.checked
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
          headers.exclude_filtered_fields_from_autocomplete = thisChecked
          var fieldFilters = thisChecked ?
            (Util.getJson(currJson, [ "common", "headers", "field_filters" ]) || []) :
            []
          AutocompletionManager.registerFilterList(getFilterId(index), fieldFilters)
        })
      })
    }
  }

  /** Used to share a table-uuid with other components */
  function getFilterId(index) {
    return "field_filter_" + index
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    onSelect: onSelect,
    register: register,

    getFilterId: getFilterId
  }

}())
