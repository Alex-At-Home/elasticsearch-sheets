/**
 * Handles importing Kibana tables
 */

var KibanaImportManager = (function() {

  /** Converts the Kibana specific URL JSON encoding into JSON */
  function urlObjToJson_(urlObjStr, state) {
    var newState = function() { return {
      currObj: null,
      currArray: null,
      currField: null,
      recursionOver: false,
      maxIndex: 0
    }}
    var setTokenValue = function(extractedVal, offset) {
      if (state.currObj && state.currField) {
        state.currObj[currField] = extractedVal
        state.currField = null
      } else if (currArray) {
        state.currArray.push(extractedVal)
      } else {
        throw new "Unexpected value token at offset [" + offset + "] in [" + urlObjStr + "]"
      }
    }
    var eatNextToken = function(offset) {
      var str = urlObjStr
      var j = offset
      if (',' == str[j]) {
        j++
      } else if (':' == str[j]) {
        j++
      } else if ('(' == str[j]) {
        j++
        var subState = newState()
        subState.currObj = {}
        var subStr = urlObjStr.substring(j)
        setTokenValue(urlObjToJson(subStr, subState), offset)

      } else if (')' == str[j]) {
        j++
        state.recursionOver = true
        state.maxIndex = j

      } else if (('!' == str[j]) && ('(' == str[j + 1])) {
        j += 2
        var subState = newState()
        subState.currArray = []
        var subStr = urlObjStr.substring(j)
        setTokenValue(urlObjToJson(subStr, subState), offset)

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
          j++
          var subStr = urlObjStr.substring(j)
          var closingIndex = subString.indexOf("'")
          j += closingIndex
          var theString = subStr.substring(0, closingIndex)
          if (state.currField || state.currArray) {
            setTokenValue(theString, offset)
          } else {
            currField = theString
          }

      } else { // field or value, might not be a string (if it's a field)
        var subStr = urlObjStr.substring(j)
        //TODO pull out extractedValAsStr ... keep reading [a-zA-Z0-9_%]
        if (state.currField || state.currArray) {
          var extractedVal = extractedValAsStr // TODO might a number
          setTokenValue(extractedVal, offset)
        } else {
          currField = extractedValAsStr
        }
      }
      return j
    }

    if (!state) {
      state = newState()
      state.currObj = {}
    }
    var len = urlObjStr.length
    for (var i = 0; i < len; ) {
      i = eatNextToken(i)
      if (state.recursionOver) {
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
