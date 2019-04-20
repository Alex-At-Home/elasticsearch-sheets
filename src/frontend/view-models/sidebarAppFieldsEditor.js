var FieldsEditor = (function() {

  /** Util - should output fields be used in autocomplete */
  function autocompleteAndFilterMerged_(tableType) {
    return ('mgmt' != tableType) && ('agg' != tableType)
  }
  /** Util - does this table type support autocomplete at all? */
  function supportsAutocomplete_(tableType) {
    return ('mgmt' != tableType)
  }

  /** Is this a selected table type, or a dormant one? */
  function isEnabled_(json, tableType) {
    var adjustedTableType =
      ("agg" == tableType) ? "aggregation" :
      (("mgmt" == tableType) ? "cat" :
      tableType)
    var enabledPath = adjustedTableType + "_table"
    var tableObj = json[enabledPath] || {}
    return !tableObj.hasOwnProperty("enabled") || tableObj.enabled
  }

  /** Build the HTML for the fields editor for this table */
  function buildHtmlStr(index, tableType) {

    var checkbox = autocompleteAndFilterMerged_(tableType) ?
    `
    <div class="checkbox">
      <label><input type="checkbox" id="exclude_${tableType}_${index}">Exclude from autocompletion</label>
    </div>
    `
    : ""

    var separateAutocompleteForm =
      supportsAutocomplete_(tableType) && !autocompleteAndFilterMerged_(tableType) ?
      `
      <label>Autocomplete filter</label>
      <div class="medium_ace_editor" id="autocomplete_filter_${tableType}_${index}"></div>
      `
      : ""

    var form =
    `
    <form>
    <div class="form-group">
      <label>Field selection and ordering</label>
      <div class="medium_ace_editor" id="field_filter_${tableType}_${index}"></div>
      ${checkbox}
      <label>Field aliases and ordering</label>
      <div class="medium_ace_editor" id="field_aliases_${tableType}_${index}"></div>
      ${separateAutocompleteForm}
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

    // Conditional formats:

    var separateAutocompleteForm =
      supportsAutocomplete_(tableType) && !autocompleteAndFilterMerged_(tableType)

    // Only register fields if I'm selected (since the logic depends on table type)
    var isEnabled = isEnabled_(json, tableType)

    if (separateAutocompleteForm) {
      var autoFilterEditorId = `autocomplete_filter_${tableType}_${index}`
      var currAutoFilterEditor = ace.edit(autoFilterEditorId)
      var autoFieldFilters = Util.getJson(json, [ "common", "headers", "autocomplete_filters" ]) || []
      currAutoFilterEditor.session.setValue(autoFieldFilters.join("\n"))

      if (isEnabled) {
        AutocompletionManager.registerFilterList(TableManager.getTableId(index), autoFieldFilters)
      }
    } else if (supportsAutocomplete_(tableType)) {
      if (isEnabled) {
        AutocompletionManager.registerFilterList(TableManager.getTableId(index), fieldFilters)
      }
    }

    if (autocompleteAndFilterMerged_(tableType)) {
      var excludeFilteredFields =
        Util.getJson(json, [ "common", "headers", "exclude_filtered_fields_from_autocomplete" ]) || false

      $(`#exclude_${tableType}_${index}`).prop('checked', excludeFilteredFields)
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

      var separateAutocompleteForm =
        supportsAutocomplete_(tableType) && !autocompleteAndFilterMerged_(tableType)

      if (separateAutocompleteForm) {
        var autoFilterEditorId = `autocomplete_filter_${tableType}_${index}`
        var currAutoFilterEditor = ace.edit(autoFilterEditorId)
        currAutoFilterEditor.resize()
      }
    }
  }

  /** Called from the table types' "register", Adds event handlers to all the common elements */
  function register(index, name, json, globalEditor, tableType) {

    var filterEditorId = `field_filter_${tableType}_${index}`
    var currFilterEditor = ace.edit(filterEditorId)
    currFilterEditor.session.setTabSize(3)
    currFilterEditor.session.setUseWrapMode(true)
    currFilterEditor.session.setMode("ace/mode/ini")
    if (supportsAutocomplete_(tableType)) {
      currFilterEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      if (autocompleteAndFilterMerged_(tableType)) {
        currFilterEditor.completers = [
          AutocompletionManager.dataFieldCompleter(`index_${tableType}_${index}`, "all_raw"),
        ]
        if ('data' == tableType) {
          currFilterEditor.completers.push(AutocompletionManager.filterFieldGroupCompleter)
        }
      } else if ('agg' == tableType) {
        currFilterEditor.completers = [
          AutocompletionManager.aggregationOutputCompleter(TableManager.getTableId(index))
        ]
      }
    }

    var aliasEditorId = `field_aliases_${tableType}_${index}`
    var currAliasEditor = ace.edit(aliasEditorId)
    currAliasEditor.session.setTabSize(3)
    currAliasEditor.session.setUseWrapMode(true)
    currAliasEditor.session.setMode("ace/mode/ini")
    if (supportsAutocomplete_(tableType)) {
      currAliasEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      if (autocompleteAndFilterMerged_(tableType)) {
        currAliasEditor.completers = [
          AutocompletionManager.dataFieldCompleter(`index_${tableType}_${index}`, "raw"),
        ]
      } else if ('agg' == tableType) {
        currAliasEditor.completers = [
          AutocompletionManager.aggregationOutputCompleter(TableManager.getTableId(index))
        ]
      }
    }

    var separateAutocompleteForm =
      supportsAutocomplete_(tableType) && !autocompleteAndFilterMerged_(tableType)

    if (separateAutocompleteForm) {
      var autoFilterEditorId = `autocomplete_filter_${tableType}_${index}`
      var currAutoFilterEditor = ace.edit(autoFilterEditorId)
      currAutoFilterEditor.session.setTabSize(3)
      currAutoFilterEditor.session.setUseWrapMode(true)
      currAutoFilterEditor.session.setMode("ace/mode/ini")
      currAutoFilterEditor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: true
      })
      currAutoFilterEditor.completers = [
        AutocompletionManager.dataFieldCompleter(`index_${tableType}_${index}`, "all_raw"),
        AutocompletionManager.filterFieldGroupCompleter
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
        if (autocompleteAndFilterMerged_(tableType)) {
          if (isEnabled_(currJson, tableType)) {
            AutocompletionManager.registerFilterList(TableManager.getTableId(index), fieldFilters)
          }
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
    if (separateAutocompleteForm) {
      currAutoFilterEditor.session.on('change', function(delta) {
        Util.updateRawJson(globalEditor, function(currJson) {
          var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
          var currAutoText = currAutoFilterEditor.session.getValue()
          var autoFieldFilters = currAutoText.split("\n")
          headers.autocomplete_filters = autoFieldFilters
          if (isEnabled_(currJson, tableType)) {
           AutocompletionManager.registerFilterList(TableManager.getTableId(index), autoFieldFilters)
         }
        })
      })
    }

    if (autocompleteAndFilterMerged_(tableType)) {
      $(`#exclude_${tableType}_${index}`).change(function() {
        var thisChecked = this.checked
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
          headers.exclude_filtered_fields_from_autocomplete = thisChecked
          var fieldFilters = thisChecked ?
            (Util.getJson(currJson, [ "common", "headers", "field_filters" ]) || []) :
            []
          if (isEnabled_(currJson, tableType)) {
            AutocompletionManager.registerFilterList(TableManager.getTableId(index), fieldFilters)
          }
        })
      })
    }
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    onSelect: onSelect,
    register: register
  }

}())
