var Util = (function(){
  /** quick and dirty way of avoiding circular event changes */
  var tempDisableJsonChange_ = false

  /** Mutable internal variable that controls synchronous typing */
  var jsonUpdateTimerId_
  /** How long after we stop typing the JSON will be updated */
  var jsonUpdateTimerInterval_ = 200 //ms

  /** How long after we stop typing the state will be stashed */
  var saveTimerInterval_ = 2000 //(ms)

  /** Stores the timer id for that editor */
  var saveTimers_ = {}

  /** All the handlers called, indexed by editor id */
  var eventQueues_ = {}

  // Misc utils:

  /** Status/error display */
  function showStatus(message, summary) {
    console.log(`showStatus: ${summary}: ${JSON.stringify(message)}`)
    google.script.run.showStatus(message, summary)
  }

  /** Launches a top level Yes/No prompt and calls the appropriate callback */
  function launchYesNoPrompt(title, question, onYesFn, onNoFn) {
    google.script.run.withSuccessHandler(function(obj) {
      if (obj && onYesFn) {
        onYesFn()
      } else if (!obj && onNoFn) {
        onNoFn()
      }
    }).launchYesNoPrompt("Delete metric", "Are you sure you want to delete this metric?")
  }

  // Data utils:

  /** quick and dirty way of avoiding circular event changes - if true, don't propagate
  * element changes
  * apart from one place (the raw JSON editor), this should not be needed in "client" code
  */
  function safeChangeGlobalJson(globalEditor, safeChangeFn) {
    if (!tempDisableJsonChange_) { //(if true this is being called because of an eg SQL change)
      try {
        var newJson = JSON.parse(globalEditor.session.getValue()) //(do nothing until valid)
      } catch {
        return
      }
      tempDisableJsonChange_ = true
      try {
        var retVal = safeChangeFn(newJson)
      } catch (err) {
        tempDisableJsonChange_ = false
        throw err
      }
      tempDisableJsonChange_ = false
      return retVal
    }
  }

  /** Internal - adds a JSON change to the queue */
  function addToEventQueue_(editor, updateFn) {
    clearTimeout(jsonUpdateTimerId_)
    var editorId = editor.container.id
    var list = eventQueues_[editorId] || []
    list.push({updateFn: updateFn, editor: editor})
    eventQueues_[editorId] = list
  }

  /** Update the raw JSON in the ACE code editor - asynchronously, eg when typing
  * updateFn can either mutate the input JSON or return a new object
  */
  function updateRawJson(editor, updateFn) {
    if (!tempDisableJsonChange_) {
      var editorId = editor.container.id
      addToEventQueue_(editor, updateFn)
      jsonUpdateTimerId_ = setTimeout(function() { updateRawJsonNow_() } , jsonUpdateTimerInterval_)
    }
  }
  /** Update the raw JSON in the ACE code editor - synchronously, eg on control
   * updateFn can either mutate the input JSON or return a new object
   * set updateDisplay to true if this update comes from the backend being updated
  */
  function updateRawJsonNow(editor, updateFn, updateDisplay) {
    if (!tempDisableJsonChange_) {
      addToEventQueue_(editor, updateFn)
      updateRawJsonNow_(updateDisplay)
    }
  }

  /** Update the raw JSON in the ACE code editor - handle and empty the aysnc queue */
  function updateRawJsonNow_(updateDisplay) {
    if (!tempDisableJsonChange_) {
      Object.entries(eventQueues_).forEach(function(kv) {
        var list = kv[1]
        if (list.length > 0) {
          var editor = list[0].editor
          var editorId = editor.container.id
          var jsonStr = editor.session.getValue()
          try {
            var jsonBody = JSON.parse(jsonStr) //(throws if not valid JSON)
          } catch {
            return // (just do nothing until JSON is valid)
          }
          list.forEach(function(el) {
            var updateFn = el.updateFn
            var updateByRetVal = updateFn(jsonBody)
            if (updateByRetVal) jsonBody = updateByRetVal
          })
          var newJsonStr = JSON.stringify(jsonBody, null, 3)
          if (newJsonStr != jsonStr) { // nothing to do if the strings are the same
            if (!updateDisplay) tempDisableJsonChange_ = true  //(avoids eg SQL -> raw JSON -> SQL circle)
            try {
              editor.session.setValue(newJsonStr)
              //(updates change for auto-complete purposes)
              AutocompletionManager.registerTableConfig(editorId, jsonBody)
              var saveTimer = saveTimers_[editorId]
              if (saveTimer) {
                clearTimeout(saveTimer)
              }
              saveTimers_[editorId] = setTimeout(function() {
               delete saveTimers_[editorId]
               TableListManager.stashCurrentTableConfig(editorId, jsonBody)
              }, saveTimerInterval_)
            } catch (err) {
              if (!updateDisplay) tempDisableJsonChange_ = false
              throw err
            }
          }
        }
      })
      eventQueues_ = {}
      if (!updateDisplay) tempDisableJsonChange_ = false
    }
  }

  // JSON utils

  /** Shallow copy of a JSON element */
  function shallowCopy(json, excludeField) {
    var retVal = {}
    for (var k in json) {
      if (k != excludeField) {
        retVal[k] = json[k]
      }
    }
    return retVal
  }

  /** Gets a nested JSON element */
  function getJson(json, fieldArray) {
    var tmpJson = json
    for (var j in fieldArray) {
      var key = fieldArray[j]
      if (tmpJson.hasOwnProperty(key)) {
        tmpJson = tmpJson[key]
      } else {
        return null
      }
    }
    return tmpJson
  }

  /** Gets a nested JSON element array, creates it if it doesn't exist */
  function getOrPutJsonArray(json, fieldArray) {
    var tmpJson = json
    var maxIndex = fieldArray.length - 1
    for (var j in fieldArray) {
      var key = fieldArray[j]
      if (tmpJson.hasOwnProperty(key)) {
        tmpJson = tmpJson[key]
      } else {
        var tmp = {}
        if (j == maxIndex) {
          tmp = []
        }
        tmpJson[key] = tmp
        tmpJson = tmp
      }
    }
    return tmpJson
  }


  /** Gets a nested JSON element object, creates it if it doesn't exist */
  function getOrPutJsonObj(json, fieldArray) {
    var tmpJson = json
    for (var j in fieldArray) {
      var key = fieldArray[j]
      if (tmpJson.hasOwnProperty(key)) {
        tmpJson = tmpJson[key]
      } else {
        var tmp = {}
        tmpJson[key] = tmp
        tmpJson = tmp
      }
    }
    return tmpJson
  }

  return {
    showStatus: showStatus,
    launchYesNoPrompt: launchYesNoPrompt,

    safeChangeGlobalJson: safeChangeGlobalJson,
    updateRawJson: updateRawJson,
    updateRawJsonNow: updateRawJsonNow,

    shallowCopy: shallowCopy,
    getJson: getJson,
    getOrPutJsonArray: getOrPutJsonArray,
    getOrPutJsonObj: getOrPutJsonObj
  }
}())
