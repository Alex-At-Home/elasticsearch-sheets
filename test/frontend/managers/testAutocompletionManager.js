var TestAutocompletionManager = (function() {

  var testSuiteRoot = "testAutocompletionManager"

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test filter fields utils`, function(assert) {
    //(These are duplicates of the server-side TestElasticsearchUtils.gs)

    var filterFieldTests = {
      "-": [],
      "+": [],
      "   ": [],
      "  test1  ": [ "+^test1$" ],
      " +test2,": [ "+^test2$" ],
      "-test2  ": [ "-^test2$" ],
      "-test.2  ": [ "-^test\\.2$" ],
      "t.est*test , test**tes.t": [ "+^t\\.est[^.]*test$", "+^test.*tes\\.t$" ],
      " /reg.ex*/": [ "+reg.ex*" ],
      "-/regex**/": [ "-regex**" ]
    }
    Object.keys(filterFieldTests).forEach(function(testInStr) {
      var testIn = testInStr.split(",")
      var expectedOut = filterFieldTests[testIn]
      assert.deepEqual(
        AutocompletionManager.TESTONLY.buildFilterFieldRegex_(testIn), expectedOut, `Regex test ${testIn}`)
    })

    var fieldFilters = {
      "-**": { inList: ["test"], outList: [] },
      "-stat2.filter_out": {
        inList: ["stat2.filter_out", "stat2.filter_out.in", "test", "stat1.filter_out"],
        outList: ["stat2.filter_out.in", "test", "stat1.filter_out"]
      },
      "-stat2.filter": {
        inList: ["stat2.filter_out"],
        outList: ["stat2.filter_out"]
      },
      "/stat2[.]f[0-9]/": {
        inList: ["stat2.f1", "stat2.f2", "state.filter"],
        outList: ["stat2.f1", "stat2.f2"]
      },
      "t2,/stat[0-9]/,-nothing": {
        inList: ["stat1", "stat2", "stat1.test", "t2", "stata"],
        outList: ["stat1", "stat2", "stat1.test", "t2"]
      },
      "-nothing": { inList: ["test"], outList: ["test"] }
    }
    Object.keys(fieldFilters).forEach(function(testInStr) {
      var testIn = testInStr.split(",")
      var transformedTestIn = AutocompletionManager.TESTONLY.buildFilterFieldRegex_(testIn)
      var inOut = fieldFilters[testInStr] || { inList: [], outList: [] }
      var out = inOut.inList.filter(function(el){
        return AutocompletionManager.TESTONLY.isFieldWanted_(el, transformedTestIn)
      })
      assert.deepEqual(
        out, inOut.outList, `Correct filtering for ${testInStr}`
      )
    })
  })

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test dynamic autocomplete`, function(assert) {
    var done = assert.async()
    var testRoot = testSuiteRoot + "_dynamicAutocomplete"

    //TODO: add filter integration unit tests

    var esOverride = function(indexPattern, callbackFn) {
      if ("clear" == indexPattern) {
        callbackFn({"cols": [], "rows": []})
      } else {
        callbackFn({
          "cols": [ "ignore1", "ignore2", "ignore3"],
          "rows": [
            [ `${indexPattern}_1`, "unused1", "meta1"],
            [ `${indexPattern}_2`, "unused2", "meta2"]
          ]
        })
      }
    }
    var docCaption = function(pattern, index) {
      return `doc["${pattern}_${index}"].value`
    }
    var expectedWordlistFn = function(indexPattern) { return {
      raw: [
        { caption: `${indexPattern}_1`, value: `${indexPattern}_1`, meta: 'data field (meta1)', filter_info: `${indexPattern}_1` },
        { caption: `${indexPattern}_2`, value: `${indexPattern}_2`, meta: 'data field (meta2)', filter_info: `${indexPattern}_2` }
      ],
      painless: [
        { caption: `${indexPattern}_1`, value: `${indexPattern}_1`, meta: 'data field (meta1)', filter_info: `${indexPattern}_1` },
        { caption: `${indexPattern}_2`, value: `${indexPattern}_2`, meta: 'data field (meta2)', filter_info: `${indexPattern}_2` },
        { caption: docCaption(indexPattern, 1), value: docCaption(indexPattern, 1), meta: 'document field (meta1)', filter_info: `${indexPattern}_1` },
        { caption: docCaption(indexPattern, 2), value: docCaption(indexPattern, 2), meta: 'document field (meta2)', filter_info: `${indexPattern}_2` }
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

        AutocompletionManager.registerIndexPattern("test_input", testRoot)

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
        AutocompletionManager.registerIndexPattern("test_input", testRoot)

        completionTypes.forEach(function(completionType) {
          AutocompletionManager.dataFieldCompleter("wrong_id", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, [], `if wrong index id should be empty ${completionType}`)
              didGetCalled++
            })

          var expected = expectedWordlistFn("test_pattern")[completionType]
          AutocompletionManager.dataFieldCompleter("test_input", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, expected, `gets right completion list ${completionType}`)
              didGetCalled++
            })
        })
        assert.equal(didGetCalled, 6, "completion callback was called")

        // Now apply a filter and check that applies:

        AutocompletionManager.registerFilterList(testRoot, [
          "*_1"
        ])
        completionTypes.forEach(function(completionType) {

          var expectedPreFilter = expectedWordlistFn("test_pattern")[completionType]
          var expected = expectedPreFilter.filter(function(el, ii) {
            return 0 == (ii % 2) //(just keeps the _1)
          })
          AutocompletionManager.dataFieldCompleter("test_input", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, expected, `gets right _filtered_ completion list ${completionType}`)
              didGetCalled++
            })
        })
        assert.equal(didGetCalled, 8, "completion callback was called")

        // Check when new fields are inserted, the filter is auto-applied
        $("#test_input").val("clear")
        AutocompletionManager.registerIndexPattern("test_input", testRoot)
        // Check the change took:
        AutocompletionManager.dataFieldCompleter("test_input", "raw")
          .getCompletions(null, null, null, null, function(unused, wordList) {
            assert.deepEqual(wordList, [], `check  cleared filter`)
            didGetCalled++
          })
        assert.equal(didGetCalled, 9, "completion callback was called")

        $("#test_input").val("test_pattern_b")
        AutocompletionManager.registerIndexPattern("test_input", testRoot)

        completionTypes.forEach(function(completionType) {

          var expectedPreFilter = expectedWordlistFn("test_pattern_b")[completionType]
          var expected = expectedPreFilter.filter(function(el, ii) {
            return 0 == (ii % 2) //(just keeps the _1)
          })
          AutocompletionManager.dataFieldCompleter("test_input", completionType)
            .getCompletions(null, null, null, null, function(unused, wordList) {
              assert.deepEqual(wordList, expected, `gets right _filtered_ completion list ${completionType}`)
              didGetCalled++
            })
        })
        assert.equal(didGetCalled, 11, "completion callback was called")

        done()
      })
    })

    //
  })

}())
