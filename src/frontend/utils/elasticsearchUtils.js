/**
 ** Utilities for parsing ES replies
 */
var ElasticsearchUtil = (function() {

  /** Describes a set of indices from its _mapping */
  function getMappingList(returnObj) {

    // top level is index then "mapping" then type then "properties"
    var retVal = []

    var recurse = function(obj, pathStr) {
      Object.keys(obj).forEach(function(fieldName) {
        var fieldMeta =  obj[fieldName]
        if (fieldMeta.type || fieldMeta.properties) { //else ignore
          var newPath = pathStr ? (pathStr + "." + fieldName) : fieldName

          if (fieldMeta.type) {
            // Add to retVal:
            retVal.push({
              name: newPath,
              type: fieldMeta.type
            })
            //(just handle collisions by adding both)
          } //(else is an object, just for recursion)

          if (fieldMeta.fields) {
            recurse(fieldMeta.fields, newPath)
          }
          if (fieldMeta.properties) {
            recurse(fieldMeta.properties, newPath)
          }
        }
      })
    }
    Object.keys(returnObj).forEach(function(indexName) {
      var indexObj = returnObj[indexName].mappings || {}
      if (indexObj.properties) { //7.0 support
        recurse(indexObj.properties, "")
      }
      Object.keys(indexObj).forEach(function(typeName) { //TODO: what happens in 7.x?
        var typeObj = indexObj[typeName].properties || {}
        recurse(typeObj, "")
      })
    })
    return retVal
  }

  return {
    getMappingList: getMappingList
  }
}())
