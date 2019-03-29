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
    var list = eventQueues_[editor.id] || []
    list.push({updateFn: updateFn, editor: editor})
    eventQueues_[editor.id] = list
  }

  /** Update the raw JSON in the ACE code editor - asynchronously, eg when typing */
  function updateRawJson(editor, updateFn) {
    if (!tempDisableJsonChange_) {
      addToEventQueue_(editor, updateFn)
      jsonUpdateTimerId_ = setTimeout(function() { updateRawJsonNow_() } , jsonUpdateTimerInterval_)
    }
  }
  /** Update the raw JSON in the ACE code editor - synchronously, eg on control */
  function updateRawJsonNow(editor, updateFn) {
    if (!tempDisableJsonChange_) {
      addToEventQueue_(editor, updateFn)
      updateRawJsonNow_()
    }
  }

  /** Update the raw JSON in the ACE code editor - handle and empty the aysnc queue */
  function updateRawJsonNow_() {
    if (!tempDisableJsonChange_) {
      Object.entries(eventQueues_).forEach(function(kv) {
        var list = kv[1]
        if (list.length > 0) {
          var editor = list[0].editor
          var jsonStr = editor.session.getValue()
          try {
            var jsonBody = JSON.parse(jsonStr) //(throws if not valid JSON)
          } catch {
            return // (just do nothing until JSON is valid)
          }
          list.forEach(function(el) {
            var updateFn = el.updateFn
            updateFn(jsonBody)
          })
          var newJsonStr = JSON.stringify(jsonBody, null, 3)
          tempDisableJsonChange_ = true  //(avoids eg SQL -> raw JSON -> SQL circle)
          try {
            editor.session.setValue(newJsonStr)
            var saveTimer = saveTimers_[editor.id]
            if (saveTimer) {
              clearTimeout(saveTimer)
            }
            saveTimers_[editor.id] = setTimeout(function() {
             delete saveTimers_[editor.id]
             var originalName = $(`#${editor.container.id}`).data("original_es_table_name")
             if (originalName) {
               var currentName = $(`#${editor.container.id}`).data("current_es_table_name")
               google.script.run.stashTempConfig( //(fire and forget)
                 originalName, currentName, jsonBody
               )
             }
            }, saveTimerInterval_)
          } catch (err) {
            tempDisableJsonChange_ = false
            throw err
          }
        }
      })
      eventQueues_ = {}
      tempDisableJsonChange_ = false
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
