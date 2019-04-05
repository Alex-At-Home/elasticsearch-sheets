
var GeneralEditor = (function(){
  /** Different tables have different elements enabled - this one controls the query bar */
  function hasQueryBar_(tableType) {
    switch(tableType) {
      case 'mgmt': return false
      default: return true
    }
  }

  /** Build the HTML for the general editor for this table */
  function buildHtmlStr(index, tableType) {

    var queryBar =
    `
    <div class="form-group">
    <label>Query Bar</label>
    <select class="input-small form-control" id="querybar_${tableType}_${index}">
    <option value='none'>Disabled</option>
    <option value='top'>Top</option>
    <option value='bottom'>Bottom</option>
    </select>
    </div>
    `

    var form =
    `
    <form>
    <div class="form-group">
    <label>Refresh Trigger</label>
    <select class="input-small form-control" id="trigger_${tableType}_${index}">
    <option value='disabled'>Disabled</option>
    <option value='manual'>Manual</option>
    <option value='config_change'>Config Change</option>
    <option value='control_change'>Control Change</option>
    </select>
    </div>

    ${hasQueryBar_(tableType) ? queryBar : ""}

    <div class="form-group">
    <label>Headers</label>
    <select class="input-small form-control" id="headers_${tableType}_${index}">
    <option value='top'>Top</option>
    <option value='none'>Disabled</option>
    <option value='bottom'>Bottom</option>
    </select>
    </div>
    <div class="form-group">
    <label>Pagination</label>
    <select class="input-small form-control" id="pagination_${tableType}_${index}">
    <option value='bottom'>Bottom</option>
    <option value='none'>Disabled</option>
    <option value='top'>Top</option>
    </select>
    </div>
    <div class="form-group">
    <label>Status Info</label>
    <select class="input-small form-control" id="status_${tableType}_${index}">
    <option value='top'>Top</option>
    <option value='bottom'>Bottom</option>
    <option value='none'>Disabled</option>
    </select>
    <div class="checkbox">
    <label><input type="checkbox" id="status_merge_${tableType}_${index}">Merge with query/pagination rows</label>
    </div>
    </div>
    <div class="form-group">
    <label>Formatting</label>
    <select class="input-small form-control" id="formatting_${tableType}_${index}">
    <option value='none'>Manual</option>
    <option value='minimal'>Minimal</option>
    </select>
    </div>
    <!-- TODO: add back when supported -->
    <!--
    <div class="form-group">
    <label>Table Customization</label>
    <div class="input-group">
    <div class="input-group-addon for-longer-text">
    <span class="input-group-text">Skip rows</span>
    </div>
    <input type="text" class="form-control" placeholder="Row offsets to skip" value="" id="skip_rows_${tableType}_${index}">
    </div>
    <div class="input-group">
    <div class="input-group-addon for-longer-text">
    <span class="input-group-text">Skip columns</span>
    </div>
    <input type="text" class="form-control" placeholder="Column offsets to skip" value="" id="skip_cols_${tableType}_${index}">
    </div>
    </div>
    -->
    </form>
    `

    return form
  }

  /** Called from the table types' "populate", populates the common model from the JSON */
  function populate(index, name, json, tableType) {

    // Trigger:
    var trigger = json.trigger || "control_change"
    $(`#trigger_${tableType}_${index}`).val(trigger)

    // Query bar

    if (hasQueryBar_(tableType)) {
      var querySource = Util.getJson(json, ["common", "query", "source"]) || "none"
      if (querySource == "none") {
        $(`#querybar_${tableType}_${index}`).val("none")
      } else {
        var localQueryPos = Util.getJson(json, ["common", "query", "local", "position"]) || "none"
        $(`#querybar_${tableType}_${index}`).val(localQueryPos)
      }
    }

    // Headers
    var headersPos = Util.getJson(json, ["common", "headers", "position"]) || "none"
    $(`#headers_${tableType}_${index}`).val(headersPos)

    // Pagination
    var paginationSource = Util.getJson(json, ["common", "pagination", "source"]) || "none"
    if (paginationSource == "none") {
      $(`#pagination_${tableType}_${index}`).val("none")
    } else {
      var localPaginationPos = Util.getJson(json, ["common", "pagination", "local", "position"]) || "none"
      $(`#pagination_${tableType}_${index}`).val(localPaginationPos)
    }

    // Status
    var statusPos = Util.getJson(json, ["common", "status", "position"]) || "none"
    $(`#status_${tableType}_${index}`).val(statusPos)
    var statusMerge = Util.getJson(json, ["common", "status", "merge"]) || true
    $(`#status_merge_${tableType}_${index}`).prop('checked', statusMerge)

    // Formatting
    var formatTheme = Util.getJson(json, ["common", "formatting", "theme"]) || "none"
    $(`#formatting_${tableType}_${index}`).val(formatTheme)

    // Skip rows/cols
    var skipRows = Util.getJson(json, ["common", "skip", "rows"]) || ""
    $(`#skip_rows_${tableType}_${index}`).val(skipRows)
    var skipCols = Util.getJson(json, ["common", "skip", "cols"]) || ""
    $(`#skip_cols_${tableType}_${index}`).val(skipCols)
  }

  /** Called from the table types' "register", Adds event handlers to all the common elements */
  function register(index, name, json, globalEditor, tableType) {
    // Trigger:
    $(`#trigger_${tableType}_${index}`).change(function() {
      var thisValue = this.value
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        currJson.trigger = thisValue
      })
    })
    // Query bar
    if (hasQueryBar_(tableType)) {
      $(`#querybar_${tableType}_${index}`).change(function() {
        var thisValue = this.value
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          var query = Util.getOrPutJsonObj(currJson, [ "common", "query" ])
          query.source = (thisValue == "none") ? "none" : "local" // (only supported option currently)
          var localQuery = Util.getOrPutJsonObj(currJson, [ "common", "query", "local" ])
          localQuery.position = thisValue
        })
      })
    }
    // Headers
    $(`#headers_${tableType}_${index}`).change(function() {
      var thisValue = this.value
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var headers = Util.getOrPutJsonObj(currJson, [ "common", "headers" ])
        headers.position = thisValue
      })
    })
    // Pagination
    $(`#pagination_${tableType}_${index}`).change(function() {
      var thisValue = this.value
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var pagination = Util.getOrPutJsonObj(currJson, [ "common", "pagination" ])
        pagination.source = (thisValue == "none") ? "none" : "local" // (only supported option currently)
        var localPagination = Util.getOrPutJsonObj(currJson, [ "common", "pagination", "local" ])
        localPagination.position = thisValue
      })
    })
    // Status
    $(`#status_${tableType}_${index}`).change(function() {
      var thisValue = this.value
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var status = Util.getOrPutJsonObj(currJson, [ "common", "status" ])
        status.position = thisValue
      })
    })
    $(`#status_merge_${tableType}_${index}`).change(function() {
      var thisChecked = this.checked
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var status = Util.getOrPutJsonObj(currJson, [ "common", "status" ])
        status.merge = thisChecked
      })
    })
    // Formatting
    $(`#formatting_${tableType}_${index}`).change(function() {
      var thisValue = this.value
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var formatTheme = Util.getOrPutJsonObj(currJson, [ "common", "formatting" ])
        formatTheme.theme = thisValue
      })
    })
    // Skip rows/cols
    //TODO: put back when supported
    /*
    $(`#skip_rows_${tableType}_${index}`).on("input", function(e) {
      var thisValue = this.value
      Util.updateRawJson(globalEditor, function(currJson) {
        var skip = Util.getOrPutJsonObj(currJson, [ "common", "skip" ])
        skip.rows = thisValue
      })
    })
    $(`#skip_cols_${tableType}_${index}`).on("input", function(e) {
      var thisValue = this.value
      Util.updateRawJson(globalEditor, function(currJson) {
        var skip = Util.getOrPutJsonObj(currJson, [ "common", "skip" ])
        skip.cols = thisValue
      })
    })
    */
  }
  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    register: register
  }

}())
