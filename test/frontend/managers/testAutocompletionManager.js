var TestAutocompletionManager = (function() {

  var testSuiteRoot = "testAutocompletionManager"

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test dynamic autocomplete`, function(assert) {
    var done = assert.async()
    var testRoot = testSuiteRoot + "_dynamicAutocomplete"

    var esOverride = function(indexPattern, callbackFn) {
      callbackFn({
        "cols": [ "ignore1", "ignore2", "ignore3"],
        "rows": [
          [ `${indexPattern}_1`, "unused1", "meta1"],
          [ `${indexPattern}_2`, "unused2", "meta2"]
        ]
      })
    }
    var docCaption = function(pattern, index) {
      return `doc["${pattern}_${index}"].value`
    }
    var expectedWordlistFn = function(indexPattern) { return {
      raw: [
        { caption: `${indexPattern}_1`, value: `${indexPattern}_1`, meta: 'data field (meta1)' },
        { caption: `${indexPattern}_2`, value: `${indexPattern}_2`, meta: 'data field (meta2)' }
      ],
      painless: [
        { caption: `${indexPattern}_1`, value: `${indexPattern}_1`, meta: 'data field (meta1)' },
        { caption: `${indexPattern}_2`, value: `${indexPattern}_2`, meta: 'data field (meta2)' },
        { caption: docCaption(indexPattern, 1), value: docCaption(indexPattern, 1), meta: 'document field (meta1)' },
        { caption: docCaption(indexPattern, 2), value: docCaption(indexPattern, 2), meta: 'document field (meta2)' }
      ]
    }}
    var serviceOverrides = [{
        service: ElasticsearchManager,
        method: "retrieveIndexPatternFields",
        overrideFn: esOverride
    }]
    var parentContainer = "<input id='test_input'></input>"
    Fixtures.withParentDiv(testRoot, parentContainer, function() {
      Fixtures.withMocks(serviceOverrides, function() {

        AutocompletionManager.registerIndexPattern("test_input")

        var didGetCalled = 0
        var completionTypes = [ "raw", "painless" ]
        completionTypes.forEach(function(completionType) {
          AutocompletionManager.dataFieldCompleter("test_input", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, [], `if no index pattern should be empty ${completionType}`)
              didGetCalled++
            })
        })
        assert.equal(didGetCalled, 2, "completion callback was called")

        $("#test_input").val("test_pattern")
        AutocompletionManager.registerIndexPattern("test_input")

        completionTypes.forEach(function(completionType) {
          AutocompletionManager.dataFieldCompleter("wrong_id", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, [], `if wrong index id should be empty ${completionType}`)
              didGetCalled++
            })

          var expected = expectedWordlistFn("test_input")[completionType]
          AutocompletionManager.dataFieldCompleter("test_input", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, expected, `gets right completion list ${completionType}`)
              didGetCalled++
            })
        })
        assert.equal(didGetCalled, 6, "completion callback was called")

        done()
      })
    })

    //
  })

}())
