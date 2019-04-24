var TableManager = (function() {

  ////////////////////////////////////////////////////////

  // 1] Interface with the Server

  /** Launches an expanded JSON editor for one of the table entries */
  function launchJsonEditor(tableName, currName, jsonConfig) {
    return google.script.run.launchJsonEditor(tableName, currName, jsonConfig)
  }

  /** Clears the saved config for this table element server-side */
  function clearTempConfig(tableName) {
    TableListManager.clearCachedTempConfig(tableName)
    return google.script.run.clearTempConfig(tableName)
  }

  /** Requests the server to launch the table range editor/view */
  function showTableRangeManager(tableName) {
    return google.script.run.showTableRangeManager(tableName)
  }

  // 2] Interface with the table form editor

  /** When the user creates a new table */
  function onCreateTable(newName, jsonStr) {
    try {
      var jsonBody = JSON.parse(jsonStr) //(throws if not valid JSON)
      // Call server-side to add new accordian
      TableListManager.disableInput()
      TableListManager.createNewAccordionElement(newName, jsonBody)
    } catch (err) {
      TableListManager.enableInput() //(just in case createNewAccordionElement throws)
      Util.showStatus("Updated JSON invalid: [" + err.message + "]", 'Client Error')
    }
  }

  /** When the user deletes an existing table */
  function onDeleteTable(tableName, index) {
    google.script.run.withSuccessHandler(function(obj) {
      if (obj) {
        TableListManager.onTableEntryRemoved(index)
        TableListManager.disableInput()
        try {
          TableListManager.deleteAccordionElement(tableName)
        } catch (err) {
          TableListManager.enableInput() //(just in case createNewAccordionElement throws)
          Util.showStatus("Unexpected error deleting table entry: [" + err.message + "]", 'Client Error')
        }
      }
    }).launchYesNoPrompt("Delete table", "Are you sure you want to delete the table contents and metadata?")
  }

  /** When the user updates an existing table */
  function onUpdateTable(newTableName, oldTableName, newJsonStr, index) {
    if (!validateName(newTableName)) {
      Util.showStatus("Updated table name must be non-empty and valid", 'Client Error')
    } else {
      try {
        var jsonBody = JSON.parse(newJsonStr) //(throws if not valid JSON)
        // Call server-side to add new accordian
        TableListManager.disableInput()
        TableListManager.updateAccordionElement(index, oldTableName, newTableName, jsonBody)
      } catch (err) {
        TableListManager.enableInput() //(just in case createNewAccordionElement throws)
        Util.showStatus("Updated JSON invalid: [" + err.message + "]", 'Client Error')
      }
    }
  }

  /** The user has updated the name, stash the result */
  function onUpdateTempName(newTableName, oldTableName, newJsonStr) {
    try {
      google.script.run.stashTempConfig( //(fire and forget)
        oldTableName, newTableName, JSON.parse(newJsonStr)
      )
    } catch (err) {} //(invalid JSON, just do nothing)
  }

  // 3] Utility methods

  /** Validate names */
  function validateName(name) {
     return (null != name) && ("" != name) && (null == name.match(/["'&<>]/))
  }

  /** Used to share a table-uuid with other components */
  function getTableId(index) {
    return "editor_" + index
  }

  var isStandalone_ = false

  /** Set from parent dialog to configure if this dialog is expanded standalone edtior or not */
  function setIsStandalone(isStandalone) {
    isStandalone_ = isStandalone
  }

  /** Clients can call this to determine if they are standalone */
  function isStandalone() {
    return isStandalone_
  }

  ////////////////////////////////////////////////////////

  return {
    launchJsonEditor: launchJsonEditor,
    clearTempConfig: clearTempConfig,
    showTableRangeManager: showTableRangeManager,

    onCreateTable: onCreateTable,
    onDeleteTable: onDeleteTable,
    onUpdateTable: onUpdateTable,
    onUpdateTempName: onUpdateTempName,

    validateName: validateName,
    getTableId: getTableId,
    setIsStandalone: setIsStandalone,
    isStandalone: isStandalone
  }
}())
