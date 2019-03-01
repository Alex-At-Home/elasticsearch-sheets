var Fixtures = (function(){

  /** Util method that provides the core logic for these fixtures */
  function withDiv_(divStr, testFn, keepDiv) {
    $("#test-pages").append(divStr).append(function() {
      try {
        testFn()
      } finally {
        //TODO if !keepDiv then delete once complete (can be async)
      }
    })
  }

  /** Run a test with a test div with id == name */
  function withParentDiv(name, extraHtml, testFn, keepDiv) {
    withDiv_(`<div id='${name}''>${extraHtml}</div>`, function() {
      testFn()
    }, keepDiv)
  }

  /** Run a test with a test div with id == name, and the given global editor */
  function withParentDivAndGlobalEditor(name, extraHtml, json, testFn, keepDiv) {
    var globalEditorName = `globalEditor_${name}`
    withDiv_(
      `<div id='${name}'><div id='${globalEditorName}'></div>${extraHtml}</div>`,
      function() {
        var globalEditor = ace.edit(globalEditor)
        globalEditor.session.setValue(JSON.stringify(json))
        testFn(globalEditor)
      }, keepDiv
    )
  }

  return {
    withParentDiv: withParentDiv,
    withParentDivAndGlobalEditor: withParentDivAndGlobalEditor
  }

}())
