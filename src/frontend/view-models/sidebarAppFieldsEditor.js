var FieldsEditor = (function() {

  /** Build the HTML for the fields editor for this table */
  function buildHtmlStr(index, tableType) {
    var form =
    `
    <form>
    <div class="form-group">
      <label>Field selection and ordering</label>
      <div class="checkbox">
        <label><input type="checkbox" id="exclude_${tableType}_${index}">Exclude from autocompletion</label>
      </div>
      <div id="field_filter_${tableType}_${index}"></div>
      <label>Field aliases</label>
      <div id="field_aliases_${tableType}_${index}"></div>
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

    var excludeFilteredFields =
      Util.getJson(json, [ "common", "headers", "exclude_filtered_fields_from_autocomplete" ]) || false

      $(`#exclude_${tableType}_${index}`).prop('checked', excludeFilteredFields)

    //TODO register
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

    var aliasEditorId = `field_aliases_${tableType}_${index}`
    var currAliasEditor = ace.edit(aliasEditorId)
    currAliasEditor.session.setTabSize(3)
    currAliasEditor.session.setUseWrapMode(true)

    // Populate all the fields:
    populate(index, name, json, globalEditor, tableType)

    // Register events

    currFilterEditor.session.on('change', function(delta) {
      Util.updateRawJson(globalEditor, function(currJson) {
        var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
        var currText = currFilterEditor.session.getValue()
        var fieldFilters = currText.split("\n")
        headers.field_filters = fieldFilters
        //TODO reregister
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
    $(`#exclude_${tableType}_${index}`).change(function() {
      var thisChecked = this.checked
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
        headers.exclude_filtered_fields_from_autocomplete = thisChecked
        //TODO reregister
      })
    })
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    onSelect: onSelect,
    register: register
  }

}())
