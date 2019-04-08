/*
 * Code.gs - The interface between the Server App and the Spreadsheet UI
 */

// 1] Interface with main UI

/** Allows the UI to launch a full-screen-aligned YES/NO prompt, returns true iff YES */
function launchYesNoPrompt(title, question) {
  return UiService_.launchYesNoPrompt(title, question)
}

/** A special function that inserts a custom menu when the spreadsheet opens. */
function onOpen() { return UiService_.onOpen() }

/** A special function that inserts a custom menu when the add-on is installed */
function onInstall() { return UiService_.onOpen() }

/** Edit trigger */
function onEdit(e) {
  return ElasticsearchService_.handleContentUpdates(e, /*triggerOverride*/null)
}

/** Allows for UI to launch a full screen dialog showing the query that would be launched */
function launchQueryViewer(title, queryMethod, queryUrl, queryBody) {
  return UiService_.launchQueryViewer(title, queryMethod, queryUrl, queryBody)
}

/** Allows for UI to launch a full screen dialog showing the query that would be launched */
function launchJsonEditor(tableName, currName, jsonConfig) {
  return UiService_.launchJsonEditor(tableName, currName, jsonConfig)
}

/** Handles the result of a JSON table edit - doesn't store anywhere */
function stashJsonFromEditor(tableName, currName, jsonConfig) {
  return UiService_.stashJsonFromEditor(tableName, currName, jsonConfig)
}

/** Launches the ES configuration dialog */
function launchElasticsearchConfig() { return UiService_.launchElasticsearchConfig() }

/** Creates any required internal state (first time) and launches the ES sidebar */
function launchElasticsearchTableBuilder() { return UiService_.launchElasticsearchTableBuilder() }

/** Launches a viewer for what lookup table would be generated with the current active range */
function launchLookupViewer() { return UiService_.launchLookupViewer() }

// 2] Interface with sidebar

/** Provides status/error messaging back to user via a toast pop-up */
function showStatus(message, title) { return UiService_.showStatus(message, title) }

/** The UI requests that it be reloaded following a change to data that it can't/doesn't want to try to reconcile client-side */
function reloadPage() { return UiService_.reloadPage() }

// 3] Table range management

/** Switch to the active range */
function showTableRangeManager(tableName) {
  return UiService_.showTableRangeManager(tableName)
}

/** Returns the current table range */
function getCurrentTableRange(tableName) {
  return TableService_.getCurrentTableRange(tableName)
}

/** Activates the current table range (bug in sheets code, messes up keybaord focus so use with care */
function activateTableRange(tableName) {
  return TableService_.activateTableRange(tableName)
}

/** Moves the range for the specified table */
function setCurrentTableRange(tableName, newRange) {
  return TableService_.setCurrentTableRange(tableName, newRange)
}

/** Gets the current selection */
function getCurrentSelection() {
  return TableService_.getCurrentSelection()
}

/** Lists the current data tables (including the default one used to populate the "create new table" entry */
function listTableConfigs() {
  return TableService_.listTableConfigs()
}

/** List the triggered tables in the format { table_name: trigger } */
function listTriggeredTables() {
  return TableService_.listTriggeredTables()
}

/** Stores the temp config */
function stashTempConfig(tableName, currName, tempConfig) {
  return TableService_.stashTempConfig(tableName, currName, tempConfig)
}

/** Clears the temp config */
function clearTempConfig(tableName) {
  return TableService_.clearTempConfig(tableName)
}

/** Adds a new table to the management service */
function createTable(name, tableConfigJson) {
   return TableService_.createTable(name, tableConfigJson)
}

/** Deletes a table from the management service */
function deleteTable(name) { return TableService_.deleteTable(name) }

/** Updates a table in the management service - can't update the range, that will be a separate endpoint */
function updateTable(oldName, newName, newTableConfigJson) {
  return TableService_.updateTable(oldName, newName, newTableConfigJson)
}

// 4] Interface with Elasticsearch

/** Handles the user (re-)configuring Elasticsearch */
function configureElasticsearch(esConfig) {
  return ElasticsearchService_.configureElasticsearch(esConfig)
}

/** Retrieves the ES info from the mangement service so the _client_ can perform the call. Also table info */
function getElasticsearchMetadata(tableName, tableConfig, testMode) {
  return ElasticsearchService_.getElasticsearchMetadata(tableName, tableConfig, testMode)
}

/** Builds an aggregation query from the UI focused config model */
function buildAggregationQuery(config, querySubstitution) {
  return ElasticsearchService_.buildAggregationQuery(config, querySubstitution)
}

/** Populates the data table range with the given SQL response (context comes from "getElasticsearchMetadata") */
function handleSqlResponse(tableName, tableConfig, context, json, sqlQuery) {
  return ElasticsearchService_.handleSqlResponse(tableName, tableConfig, context, json, sqlQuery)
}

/** Populates the data table range with the given "_cat" response (context comes from "getElasticsearchMetadata") */
function handleCatResponse(tableName, tableConfig, context, json, catQuery) {
  return ElasticsearchService_.handleCatResponse(tableName, tableConfig, context, json, catQuery)
}

/** Populates the data table range with the given aggregation response (context comes from "getElasticsearchMetadata") */
function handleAggregationResponse(tableName, tableConfig, context, json, aggQueryJson) {
  return ElasticsearchService_.handleAggregationResponse(tableName, tableConfig, context, json, aggQueryJson)
}

/** Populates the data table range with the given query response (context comes from "getElasticsearchMetadata") */
function handleDataResponse(tableName, tableConfig, context, json, queryJson) {
  return ElasticsearchService_.handleDataResponse(tableName, tableConfig, context, json, queryJson)
}

// 5] User defined function

/**
 * Displays a simple summary of the JSON array represented as a variable number
 * of strings, eaching containing a JSON-stringified object
 *
 * @param {json_str1, json_str2, ...} args A variable number of strings, each containing a JSON object
 * @return A string describing the array
 * @customfunction
 */
function summarizeEsSubTable(args) {
  return ElasticsearchService_.summarizeEsSubTable(arguments)
}

/**
 * Builds a sub-table out of an array of JSON objects stored in a single cell of an
 * Elasticsearch "data table" as represented by "=summarizeEsSubTable(...)"
 *
 * @param {range} subTableCell The range of a single cell containing a complex array that was generated
 *                              by a Data Table, eg is in the format "=summarizeEsSubTable(...)"
 * @param {} configOverride (Optional - for advanced users only)
 *                                 A stringified JSON object containing a config object
 *                                 that can be used to describe the field aliases and filters
 *                                 (uses the standard table config format). "{}" can be used
 *                                 to ignore the actual table settings.
 * @return A 2-d cell array where the values are the table generated by the input array
 *         (first row is the header, if enabled)
 * @customfunction
 */
function buildEsSubTable(subTableCell, configOverride) {
  return ElasticsearchService_.buildEsSubTable(subTableCell, configOverride)
}

/** Triggers a refresh of the table that is currently "under the cursor" */
function refreshSelectedTable() {
  var event = { range: SpreadsheetApp.getActiveRange() }
  return ElasticsearchService_.handleContentUpdates(event, "manual")
}
