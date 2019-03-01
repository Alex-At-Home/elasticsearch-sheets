/*
 * UiService.gs - business logic for launching front-end views
 */
var UiService_ = (function(){

  // 1] Interface with main UI

  /** A special function that inserts a custom menu when the spreadsheet opens. */
  function onOpen() {
    var menu = [
      {name: 'Launch Elasticsearch Table Builder', functionName: 'launchElasticsearchTableBuilder'},
      {name: 'Configure Elasticsearch...', functionName: 'launchElasticsearchConfig'}
    ]
  //  var parentMenu = SpreadsheetApp.getUi().createAddonMenu()
  //  parentMenu.addItem('Launch Elasticsearch Table Builder', 'launchElasticsearchTableBuilder_')
  //  parentMenu.addItem(''Configure Elasticsearch...', 'launchElasticsearchConfig')
    SpreadsheetApp.getActive().addMenu('Elasticsearch', menu)
  }

  /** Creates any required internal state (first time) and launches the ES sidebar */
  function launchElasticsearchTableBuilder(tableNameToSelect) {
    // If necessary, initialize the management service
    var mgmtService = getManagementService_()
    if (null == mgmtService) {
      launchElasticsearchConfig()
    }
    // We get to here when the modal gets stopped, so the management service should now be populated
    mgmtService = getManagementService_()
    if (null == mgmtService) {
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
    var mgmtService = getManagementService_()
    var html = HtmlService.createTemplateFromFile('elasticsearchConfigDialog')
    if (null == mgmtService) {
       html.currentUrl = ""
       html.currentUsername = ""
       html.currentAuthType = "anonymous"
    } else {
       var es_meta = getEsMeta_(mgmtService)
       html.currentUrl = es_meta.url
       html.currentUsername = es_meta.username
       if (es_meta.auth_type == "password") {
          if (es_meta.password_global) {
             html.currentAuthType = "password_global"
          } else {
             html.currentAuthType = "password_local"
          }
       } else {
          html.currentAuthType = es_meta.auth_type
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
    var mgmtService = getManagementService_()
    updateTempSavedObject_(mgmtService, tableName, currName, jsonConfig) //(save current contents)
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
    //TODO: need to clear the temp saved object (inc default) on create/(update - done)/reset/clear
    var mgmtService = getManagementService_()
    updateTempSavedObject_(mgmtService, tableName, currName, jsonConfig) //(save updated contents from editor)
    launchElasticsearchTableBuilder_(tableName)
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
