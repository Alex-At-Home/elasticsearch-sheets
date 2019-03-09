var Fixtures = (function(){

  var afterTest_ = []

  /** Assumes test run sequentially, calls once the after test */
  function afterEach() {
    afterTest_.forEach(function(onCompleteFn) { return onCompleteFn() })
    afterTest_ = []
  }


  /** Util method that provides the core logic for these fixtures */
  function withDiv_(divStr, testFn, onCompleteFn) {
    $("#test-pages").append(divStr).append(function() {
      if (onCompleteFn) afterTest_.push(onCompleteFn)
      testFn()
    })
  }

  /** Run a test with a test div with id == name */
  function withParentDiv(name, extraHtml, testFn, keepDiv) {
    withDiv_(`<div id='${name}'>${extraHtml}</div>`, function() {
      testFn()
    }, function() {
      if (!keepDiv) {
        $(`#${name}`).remove()
      }
    })
  }

  /** Run a test with a test div with id == name, and the given global editor */
  function withParentDivAndGlobalEditor(name, extraHtml, json, testFn, keepDiv) {
    var globalEditorName = `globalEditor_${name}`
    withDiv_(
      `<div id='${name}'><div id='${globalEditorName}'></div>${extraHtml}</div>`,
      function() {
        var globalEditor = ace.edit(globalEditorName)
        globalEditor.session.setValue(JSON.stringify(json))
        testFn(globalEditor)
      }, function() {
        if (!keepDiv) {
          $(`#${name}`).remove()
        }
      }
    )
  }

  /** serviceOverrides: [ { service: serviceObject, method: string, overrideFn: fn } ] */
  function withMocks(serviceOverrides, testFn) {
    var saved = []
    serviceOverrides.forEach(function(el) {
      saved.push(
        { service: el.service, method: el.method, overrideFn: el.service[el.method] }
      )
      el.service[el.method] = el.overrideFn
    })
    afterTest_.push(function() {
      saved.forEach(function(el) {
        el.service[el.method] = el.overrideFn
      })
    })
    testFn()
  }

  return {
    afterEach: afterEach,

    withParentDiv: withParentDiv,
    withParentDivAndGlobalEditor: withParentDivAndGlobalEditor,

    withMocks: withMocks
  }

}())
