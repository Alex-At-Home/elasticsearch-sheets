/**
 * Handles importing Kibana tables
 */

var KibanaImportManager = (function() {

  /** Converts the Kibana specific URL JSON encoding into JSON */
  function urlObjToJson_(urlObjStr, state) {
    /** So can put logging back in again */
    var debugMode_ = false

    var newState = function() { return {
      currObj: null,
      currArray: null,
      currField: null,
      recursionOver: false,
      maxIndex: 0
    }}
    // Handles using ! as an escape and then URL decode
    var decodeStr = function(str) {
      return decodeURIComponent(
        str.replace(/[!][!]/g, "%21").replace(/[!][']/g, "'")
      )
    }

    var setTokenValue = function(extractedVal, offset) {
      if (state.currObj && state.currField) {
        state.currObj[state.currField] = extractedVal
        state.currField = null
      } else if (state.currArray) {
        state.currArray.push(extractedVal)
      } else {
        var stateStr = JSON.stringify(state)
        throw "Unexpected value token [" + extractedVal + "] at offset [" + offset +
                "], state [" + stateStr + "] in [" + urlObjStr + "]"
      }
    }
    var eatNextToken = function(offset) {
      var str = urlObjStr
      var j = offset

if (debugMode_) console.log(`state=${JSON.stringify(state)} index=${j}, token=${str[j]}`)

      if (',' == str[j]) {
        j++
      } else if (':' == str[j]) {
        j++
      } else if ('(' == str[j]) {
if (debugMode_) console.log("into object")

        j++
        var subState = newState()
        subState.currObj = {}
        var subStr = urlObjStr.substring(j)
        setTokenValue(urlObjToJson_(subStr, subState), offset)
        j += subState.maxIndex

      } else if (')' == str[j]) {
if (debugMode_) console.log("exit object/array")

        j++
        state.recursionOver = true
        state.maxIndex = j

      } else if (('!' == str[j]) && ('(' == str[j + 1])) {
if (debugMode_) console.log("into array")

        j += 2
        var subState = newState()
        subState.currArray = []
        var subStr = urlObjStr.substring(j)
        setTokenValue(urlObjToJson_(subStr, subState), offset)
        j += subState.maxIndex

      } else if (('!' == str[j]) && ('n' == str[j + 1])) {
        j += 2
        setTokenValue(null, offset)

      } else if (('!' == str[j]) && ('t' == str[j + 1])) {
        j += 2
        setTokenValue(true, offset)

      } else if (('!' == str[j]) && ('f' == str[j + 1])) {
        j += 2
        setTokenValue(false, offset)

      } else if (' ' == str[j]) { //space
        j++
      } else if ("'" == str[j]) { //field or value, definitely a string
          var escapeMode = false
          for (var jj = j + 1; jj < str.length; ++jj) { // Handle !! escaping
            var snack = str[jj]
            if ('!' == snack) {
              escapeMode = !escapeMode
            } else if ("'" == snack) {
              if (!escapeMode) break
            } else {
              escapeMode = false
            }
          }
          var theString = str.substring(j + 1, jj)
          j = jj + 1
          if (state.currField || state.currArray || false) {
            setTokenValue(decodeStr(theString), offset)
          } else {
            state.currField = decodeStr(theString)
          }

      } else { // field or value, might not be a string (if it's a field)
        var subStr = urlObjStr.substring(j)
        var myRe = new RegExp("[^ !:,()']+")
        var reArray = myRe.exec(subStr)
        j += reArray.index + reArray[0].length
        var extractedValAsStr = reArray[0].trim()

if (debugMode_) console.log(`extracted [${extractedValAsStr}]: [${state.currField || state.currArray}] ... eaten [${reArray.index}] + [${extractedValAsStr.length}]`)

        if (state.currField || state.currArray) {
          extractedValAsNum = Number.parseFloat(extractedValAsStr)
          if (Number.isNaN(extractedValAsNum)) {
            setTokenValue(decodeStr(extractedValAsStr), offset)
          } else {
            setTokenValue(extractedValAsNum, offset)
          }
        } else {
          state.currField = decodeStr(extractedValAsStr)
        }
      }
      return j
    }

    if (!state) {
      state = newState()
      state.currObj = {}
      state.currField = "json"
    }
    var len = urlObjStr.length
    for (var i = 0; i < len; ) {
      var old_i = i
      i = eatNextToken(i)

if (debugMode_) console.log(`Eaten to [${i}] from [${old_i}] vs [${len}]: exit? [${state.recursionOver}]`)

      if (i == old_i) {
        var stateStr = JSON.stringify(state)
        throw "Stuck in recursion at [" + i + "] in [" + urlObjStr + "], state=[" + stateStr + "]"
      }
      if (state.recursionOver) {
if (debugMode_) console.log(`Completed obj/array: ${JSON.stringify(state.currObj || state.currArray)}`)
          return state.currObj || state.currArray
      }
    }
    return state.currObj || state.currArray
  }

  return {
    TESTONLY: {
      urlObjToJson_: urlObjToJson_
    }
  }
}())

// Sample:
/*

*/
