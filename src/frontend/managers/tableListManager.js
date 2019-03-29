var TableListManager = (function() {

//TODO: issues
// update fails with "updated name must be valid"
// view table range not working

  // 1] Service methods to manipulate the Table List:

  /** Create a new data table UI element */
  function createNewAccordionElement(name, json) {
    google.script.run.withSuccessHandler(
      function(obj) {
        if (obj) {
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
        } else { //(request failed or no input)
          enableInput()
        }
      }
    ).withFailureHandler(
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
            var triggerType = esMeta.query_trigger || "timed"
            if ("timed" == esMeta.query_trigger) {
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

  /** At desired interval, checks if any tables need refreshing */
  function onTableRefresh_() {

    var scheduleNextRefresh = function() {
      refreshTimerId_ = setTimeout(function() {
        onTableRefresh_()
      }, timerInterval_)
    }

    // Get tables in need of refresh:
    google.script.run.withSuccessHandler(function(obj) {
      try {
        Object.entries(obj).map(function(kv) {
          //TODO: I'm not sure this is right .. needs to be the _latest_ table config
          var tableConfig = State_.getEntryByName(kv[0])
          if (tableConfig) {
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

  var State_ = (function() {
    var accordianOneUp = 0
    var accordianNames = {}
    var accordianBodies = {}
    var accordianBodiesByName = {}

    // Methods:
    return {
      /** The current 1-up to use as an index */
      getOneUp: function() { return accordianOneUp },

      getEntryByName: function(name) {
        return accordianBodiesByName[name]
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
    //TODO: keep entries that are already open, open
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

    buildAccordionTableFromSource: buildAccordionTableFromSource,

    onTableEntryAdded: onTableEntryAdded,
    onTableEntryRemoved: onTableEntryRemoved,
    enableInput: enableInput,
    disableInput: disableInput
  }
}())
