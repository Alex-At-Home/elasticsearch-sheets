var TableManager = (function() {

  ////////////////////////////////////////////////////////

  // 1] Interface with the Server

  /** Launches an expanded JSON editor for one of the table entries */
  function launchJsonEditor(tableName, currName, jsonConfig) {
    return google.script.run.launchJsonEditor(tableName, currName, jsonConfig)
  }

  /** Clears the saved config for this table element server-side */
  function clearTempConfig(tableName) {
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
    //TODO: and apply the query one creation is complete
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
    //TODO: I think we want to refresh the query here (after the update is complete)?
  }

  // 3] Utility methods

  /** Validate names */
  function validateName(name) {
     return (null != name) && ("" != name) && (null == name.match(/["'&<>]/))
  }


  ////////////////////////////////////////////////////////

  return {
    launchJsonEditor: launchJsonEditor,
    clearTempConfig: clearTempConfig,
    showTableRangeManager: showTableRangeManager,

    onCreateTable: onCreateTable,
    onDeleteTable: onDeleteTable,
    onUpdateTable: onUpdateTable,

    validateName: validateName
  }
}())
