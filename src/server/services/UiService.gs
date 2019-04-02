/*
 * UiService.gs - business logic for launching front-end views
 */
var UiService_ = (function(){

  // 1] Interface with main UI

  /** A special function that inserts a custom menu when the spreadsheet opens. */
  function onOpen() {
    // Try both add-on and normal menu - one will work
    /*
    try {
      var menu = [
        {name: 'Launch Elasticsearch Table Builder', functionName: 'launchElasticsearchTableBuilder'},
        {name: 'Configure Elasticsearch...', functionName: 'launchElasticsearchConfig'},
        {name: 'View range\'s lookup map', functionName: 'launchLookupViewer'},
        {name: 'Refresh active table', functionName: 'refreshSelectedTable'},
      ]
      SpreadsheetApp.getActive().addMenu('Elasticsearch', menu)
    } catch (err) {}
    */
    try {
      SpreadsheetApp.getUi()
        .createAddonMenu()
        .addItem('Launch Elasticsearch Table Builder', 'launchElasticsearchTableBuilder')
        .addItem('Configure Elasticsearch...', 'launchElasticsearchConfig')
        .addItem('View range\'s lookup map', 'launchLookupViewer')
        .addItem('Refresh active table', 'refreshSelectedTable')
        .addToUi();
    } catch (err) {}
  }

  /** Creates any required internal state (first time) and launches the ES sidebar */
  function launchElasticsearchTableBuilder(tableNameToSelect) {
    // If necessary, initialize the management service
    if (!ManagementService_.isManagementServiceCreated()) {
      launchElasticsearchConfig()
    }
    // We get to here when the modal gets stopped, so the management service should now be populated
    if (!ManagementService_.isManagementServiceCreated()) {
       return
    }

    if (firstTime_) {
       TableService_.checkTableRangesAgainstDataRanges()
       firstTime_ = false
    }

    // Launch the sidebar
    var html = HtmlService.createTemplateFromFile('sidebarApp')
    html.defaultKey = ManagementService_.getDefaultKeyName()
    html.selectedTable = tableNameToSelect || ""

    if (TestService_.inTestMode()) {
       TestService_.triggerUiEvent("sidebarApp", { default_key: html.defaultKey, selected_table: html.selectedTable })
    } else {
       SpreadsheetApp.getUi().showSidebar(html.evaluate().setTitle('Elasticsearch Table Builder'))
    }
  }

  /** Launches the ES configuration dialog */
  function launchElasticsearchConfig() {
    var html = HtmlService.createTemplateFromFile('elasticsearchConfigDialog')
    if (!ManagementService_.isManagementServiceCreated()) {
       html.currentUrl = ""
       html.currentUsername = ""
       html.currentAuthType = "anonymous"
    } else {
       var esMeta = ManagementService_.getEsMeta()
       html.currentUrl = esMeta.url
       html.currentUsername = esMeta.username
       if (esMeta.auth_type == "password") {
          if (esMeta.password_global) {
             html.currentAuthType = "password_global"
          } else {
             html.currentAuthType = "password_local"
          }
       } else {
          html.currentAuthType = esMeta.auth_type
       }
    }
    if (TestService_.inTestMode()) {
       TestService_.triggerUiEvent("elasticsearchConfigDialog", {
          current_url: html.currentUrl, current_username: html.currentUsername, current_auth_type: html.currentAuthType
       })
    } else {
       SpreadsheetApp.getUi().showModalDialog(html.evaluate().setWidth(450).setHeight(350), 'Elasticsearch Configuration')
    }
  }

  /** Launches a viewer for what lookup table would be generated with the current active range */
  function launchLookupViewer() {
    var html = HtmlService.createTemplateFromFile('lookupViewerDialog')
    var ss = SpreadsheetApp.getActive()
    if (null == ss.getActiveRange()) {
      showStatus("Must have active range", "Server Error")
      return
    }
    var nameOrNotation = LookupService_.getNamedRangeOrNotation(ss.getActiveRange())
    html.lookupJson = LookupService_.getJsonLookup(nameOrNotation)
    html.lookupReference = "$$lookupMap(" + nameOrNotation + ")"
    if (TestService_.inTestMode()) {
      TestService_.triggerUiEvent("launchLookupViewer", {
         lookup_json: html.lookupJson, lookup_reference: html.lookupReference
      })
    } else {
      var ui = SpreadsheetApp.getUi()
      ui.showModalDialog(html.evaluate().setWidth(600).setHeight(600), "Lookup Map Viewer")
    }
  }

  // 2] Interface with sidebar

  /** Provides status/error messaging back to user via a toast pop-up */
  function showStatus(message, title) {
     if (TestService_.inTestMode()) {
        TestService_.triggerUiEvent("toast", { message: message, title: title })
     } else {
        SpreadsheetApp.getActiveSpreadsheet().toast(message, title)
     }
  }

  /** The UI requests that it be reloaded following a change to data that it can't/doesn't want to try to reconcile client-side */
  function reloadPage() {
    launchElasticsearch_()
  }

  /** Allows the UI to launch a full-screen-aligned YES/NO prompt, returns true iff YES */
  function launchYesNoPrompt(title, question) {
    if (TestService_.inTestMode()) {
       TestService_.triggerUiEvent("launchYesNoPrompt", {
          title: title, question: question
       })
       return (title.indexOf("YES") >= 0)
    } else {
     var ui = SpreadsheetApp.getUi()
     var response = ui.alert(title, question, ui.ButtonSet.YES_NO)
     return (response == ui.Button.YES)
    }
  }

  /** Allows for UI to launch a full screen dialog showing the query that would be launched */
  function launchQueryViewer(title, queryMethod, queryUrl, queryBody) {
    if (TestService_.inTestMode()) {
       TestService_.triggerUiEvent("launchQueryViewer", {
          title: title, queryMethod: queryMethod, queryUrl: queryUrl, queryBody:queryBody
       })
    } else {
       var html = HtmlService.createTemplateFromFile('queryViewerDialog')
       html.queryMethod = queryMethod
       html.queryUrl = queryUrl
       html.queryBody = queryBody
       var ui = SpreadsheetApp.getUi()
       ui.showModalDialog(html.evaluate().setWidth(600).setHeight(600), title)
    }
  }

  /** Allows for UI to launch a full screen dialog showing the query that would be launched */
  function launchJsonEditor(tableName, currName, jsonConfig) {
    ManagementService_.updateTempSavedObject(tableName, currName, jsonConfig) //(save current contents)
    if (TestService_.inTestMode()) {
       TestService_.triggerUiEvent("launchJsonEditor", {
          table_name: tableName, config: jsonConfig
       })
    } else {
       var html = HtmlService.createTemplateFromFile('tableEditorDialog')
       html.defaultKey = ManagementService_.getDefaultKeyName()
       html.curr_name = currName
       html.table_name = tableName
       html.config = JSON.stringify(jsonConfig, null, 3)
       var ui = SpreadsheetApp.getUi()
       ui.showModalDialog(html.evaluate().setWidth(800).setHeight(1000), 'Edit: ' + (currName || "(no name)"))
    }
  }

  /** Handles the result of a JSON table edit - doesn't store anywhere */
  function stashJsonFromEditor(tableName, currName, jsonConfig) {
    ManagementService_.updateTempSavedObject(tableName, currName, jsonConfig) //(save updated contents from editor)
    launchElasticsearchTableBuilder(tableName)
  }

  // 3] Table range management

  /** Switch to the active range */
  function showTableRangeManager(tableName) {
    if (TableService_.activateTableRange(tableName)) {
       var html = HtmlService.createTemplateFromFile('moveRangeDialog')
       html.tableName = tableName
       SpreadsheetApp.getUi().showModelessDialog(html.evaluate().setHeight(100), 'Move Table: ' + tableName);
    }
  }

  ////////////////////////////////////////////////////////

  // Internals

  /** Allows expensive initialization/integrity checking operations to be performed only on page load */
  var firstTime_ = true

  ////////////////////////////////////////////////////////

  return {
    onOpen: onOpen,
    launchElasticsearchConfig: launchElasticsearchConfig,
    launchElasticsearchTableBuilder: launchElasticsearchTableBuilder,
    launchLookupViewer: launchLookupViewer,

    showStatus: showStatus,
    launchYesNoPrompt: launchYesNoPrompt,
    reloadPage: reloadPage,
    launchQueryViewer: launchQueryViewer,
    launchJsonEditor: launchJsonEditor,
    stashJsonFromEditor: stashJsonFromEditor,

    showTableRangeManager: showTableRangeManager,

    TESTONLY: {
    }
  }

}())
