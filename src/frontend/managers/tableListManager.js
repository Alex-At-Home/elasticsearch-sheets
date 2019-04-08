var TableListManager = (function() {

  // 1] Service methods to manipulate the Table List:

  /** Create a new data table UI element */
  function createNewAccordionElement(name, json) {
    google.script.run.withSuccessHandler(
      function(obj) {
        if (obj) {
          // Update the state: add new entry and clear any stashed data
          clearCachedTempConfig(defaultKey)
          State_.addEntry(name, json)
          rebuildAccordion(name)
        } //(else request silently failed)
        enableInput()
      }
    ).withFailureHandler(
      function(msg) {
        enableInput()
        console.log("createTable: error: [" + JSON.stringify(msg) + "]")
        Util.showStatus(JSON.stringify(msg, 3), 'Client Error')
      }
    ).createTable(name, json)
  }

  /** Create a new data table UI element */
  function updateAccordionElement(index, oldName, newName, json) {
    google.script.run.withSuccessHandler(
      function(obj) {
        if (obj && (oldName != newName)) { // else don't need to do anything
          State_.removeEntry(index)
          State_.addEntry(newName, json)
          rebuildAccordion(newName)
          enableInput()
        } else { //(except to update the cache)
          State_.updateEntryByName(oldName, json)
          enableInput()
        }
      }
    ).withFailureHandler( //(request failed or no input)
      function(msg) {
        enableInput()
        console.log("updateTable: error: [" + JSON.stringify(msg) + "]")
        Util.showStatus(JSON.stringify(msg, 3), 'Client Error')
      }
    ).updateTable(oldName, newName, json)
  }

  /** Delete a new data table UI element */
  function deleteAccordionElement(name) {
    google.script.run.withSuccessHandler(
      function(obj) {
        rebuildAccordion()
        enableInput()
      }
    ).withFailureHandler(
      function(msg) {
        enableInput()
        console.log("deleteTable: error: [" + JSON.stringify(msg) + "]")
        Util.showStatus(JSON.stringify(msg, 3), 'Client Error')
      }
    ).deleteTable(name)
  }

  // 2] Initialization

  /** Retrieves saved objects from the server and creates the data table UI elements */
  function buildAccordionTableFromSource() {
    google.script.run.withSuccessHandler(
      function(obj) {
        buildAccordionTable(obj)
        selectedTable = "" //(reset, ie only do it once)

        // Get the current metadata and start the refresh timer:
        google.script.run.withSuccessHandler(
          function(obj) {
            var esMeta = obj.es_meta
            if (esMeta.hasOwnProperty("query_trigger_interval_s")) {
              timerInterval_ = esMeta.query_trigger_interval_s*1000
            }
            var triggerType = esMeta.query_trigger || "timed_content"
            if (esMeta.query_trigger.indexOf("timed") >= 0) {
              console.log(`Starting table refresh service, interval [${timerInterval_}]`)
              onTableRefresh_()
            }
          }
        ).getElasticsearchMetadata()

      }
    ).withFailureHandler(
      function(msg) {
        console.log("listTableConfigs: error: [" + JSON.stringify(msg) + "]")
        Util.showStatus(JSON.stringify(msg, 3), 'Client Error')
      }
    ).listTableConfigs()
  }

  /** Stashes a persistent store of the user's typing, also saves locally */
  function stashCurrentTableConfig(globalEditorId, jsonBody) {
    var originalName = $(`#${globalEditorId}`).data("original_es_table_name")
    if (originalName) {
      var currentName = $(`#${globalEditorId}`).data("current_es_table_name")
      var tableConfig = State_.getEntryByName(originalName)
      if (tableConfig) {
        tableConfig.temp = jsonBody
      }
      google.script.run.stashTempConfig( //(fire and forget)
        originalName, currentName, jsonBody
      )
    }
  }

  /** Ensures the local cache of the temp is removed when the remote end is purged */
  function clearCachedTempConfig(name) {
    var originalTableConfig = State_.getEntryByName(name)
    if (originalTableConfig) {
      delete originalTableConfig.temp
    }
  }

  // 3] Utils:

  /** An entry has been added to the table list - update state */
  function onTableEntryAdded(name, json) {
    State_.addEntry(name, json)
  }

  /** An entry has been removed from he table list - update state */
  function onTableEntryRemoved(index) {
    State_.removeEntry(index)
  }

  /** Stops user monkeying around while server controls are ongoing */
  function disableInput() {
    $("#accordion").addClass('disabledbutton');
  }
  /** Stops user monkeying around while server controls are ongoing */
  function enableInput() {
    $("#accordion").removeClass('disabledbutton');
  }

  ////////////////////////////////////////////////////////

  /** Timer id for the refresh */
  var refreshTimerId_

  /** Timer interval */
  var timerInterval_ = 5000 //(ms)

  /** Latched when ES is seen to have been configured */
  var esAuthConfigured_ = false

  /** Latched first time we log that ES isn't configured */
  var esAuthConfiguredLog_ = false

  /** At desired interval, checks if any tables need refreshing */
  function onTableRefresh_() {

    var scheduleNextRefresh = function() {
      refreshTimerId_ = setTimeout(function() {
        onTableRefresh_()
      }, timerInterval_)
    }

    // Get tables in need of refresh:
    var lookForTriggeredTables = function() {
      google.script.run.withSuccessHandler(function(obj) {
        try {
          Object.entries(obj).map(function(kv) {
            var tableConfig = State_.getEntryByName(kv[0])
            if (tableConfig) {
              tableConfig = tableConfig.temp ? tableConfig.temp : tableConfig
              ElasticsearchManager.populateTable(kv[0], tableConfig, kv[1], /*testMode*/false)
            }
          })
        } catch (err) {
          throw err
        } finally {
          scheduleNextRefresh()
        }
      }).withFailureHandler(function(err) {
        scheduleNextRefresh()
      }).listTriggeredTables()
    }

    if (esAuthConfigured_) {
      lookForTriggeredTables()
    } else {
      // Very simple logic to stop unconfigured ES from stealing triggers
      //(of course it's still very easy to steal triggers, just not quite as inadvertently)
      google.script.run.withSuccessHandler(function(obj) {
        if (obj) ElasticsearchManager.getEsReadiness(obj.es_meta || {},
          function(esMeta) { // ready
            esAuthConfigured_ = true //(no longer check until table builder reloaded)
            lookForTriggeredTables()
          },
          function(esMeta) { // not ready
            if (!esAuthConfiguredLog_) {
              delete esMeta.password //(avoid leaking to logs if URL is not configured)
              console.log(`ES not configured [${JSON.stringify(esMeta)}], will keep checking until it is`)
              esAuthConfiguredLog_ = true
            }
            scheduleNextRefresh()
          }
        )
      }).withFailureHandler(function(obj) {
        console.log("Failed to retrieve ES metadata: [" + JSON.stringify(obj) + "]")
      }).getElasticsearchMetadata()
    }
  }

  var State_ = (function() {
    var accordianOneUp = 0
    var accordianNames = {}
    var accordianBodies = {}
    var accordianBodiesByName = {}

    // Methods:
    return {
      /** The current 1-up to use as an index */
      getOneUp: function() { return accordianOneUp },

      /** Gets the entire JSON object by its name */
      getEntryByName: function(name) {
        return accordianBodiesByName[name]
      },

      /** Updates an existing entry */
      updateEntryByName: function(name, newJson) {
        var curr = accordianBodiesByName[name] || {}
        if (curr.hasOwnProperty(name)) {
          accordianBodiesByName[name] = newJson
        }
      },

      /** Update state while adding entry to accordion */
      addEntry: function(name, json) {
        var index = accordianOneUp
        accordianOneUp++
        accordianNames[index] = name
        accordianBodies[index] = json
        accordianBodiesByName[name] = json
      },
      /** Update state when an entry is deleted */
      removeEntry: function(index) {
        var name = accordianNames[index] || ""
        delete accordianNames[index]
        delete accordianBodies[index]
        delete accordianBodiesByName[name]
      },
      /** Copies current state into an object and then resets the state */
      copyThenReset: function(mutableObj) {
        for (i in accordianNames) {
          var name = accordianNames[i]
          var json = accordianBodies[i]
          mutableObj[name] = json
        }
        // Reset state
        accordianOneUp = 0
        accordianNames = {}
        accordianBodies = {}
        accordianBodiesByName = {}
      }
    }
  }())

  /** Rebuilds the accordion following a complex table change (delete/update-name/create) */
  function rebuildAccordion(tableToReselect) {

    // Rebuild state
    var obj = {}
    State_.copyThenReset(obj)
    // Rebuild table
    $("#accordion").empty()
    selectedTable = tableToReselect || ""
    try {
      buildAccordionTable(obj)
    } finally {
      selectedTable = "" //(just once)
    }
  }

  /** Builds the accordion table from an object (user created or from server) */
  function buildAccordionTable(obj) {
    // First element is always the "create":
    if (obj.hasOwnProperty(defaultKey)) {
      TableForm.buildAccordionElement(State_.getOneUp(), "<div class='text-primary'>Build New Table...</div>", obj[defaultKey], /*isFirstElement=*/true)
    }

    // Then the others (sorted)
    var sortedKeys = []
    for (var key in obj) {
      sortedKeys.push(key)
    }
    sortedKeys.sort()
    for (var index in sortedKeys) {
      var key = sortedKeys[index]
      if ((key != defaultKey) && (obj.hasOwnProperty(key))) {
        TableForm.buildAccordionElement(State_.getOneUp(), key, obj[key], /*isFirstElement=*/false)
      }
    }
  }

  ////////////////////////////////////////////////////////

  return {
    createNewAccordionElement: createNewAccordionElement,
    updateAccordionElement: updateAccordionElement,
    deleteAccordionElement: deleteAccordionElement,

    stashCurrentTableConfig: stashCurrentTableConfig,
    clearCachedTempConfig: clearCachedTempConfig,

    buildAccordionTableFromSource: buildAccordionTableFromSource,

    onTableEntryAdded: onTableEntryAdded,
    onTableEntryRemoved: onTableEntryRemoved,
    enableInput: enableInput,
    disableInput: disableInput
  }
}())
