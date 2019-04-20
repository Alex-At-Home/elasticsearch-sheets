var TestAutocompletionManager = (function() {

  var testSuiteRoot = "testAutocompletionManager"

  //TODO: add painless auto-completion test (including dynamic autocomplete)
  //TODO: have test for (forthcoming) bucket output autocomplete

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test filter fields utils`, function(assert) {
    //(These are duplicates of the server-side TestElasticsearchResponseUtils.gs)

    var filterFieldTests = {
      "-,+": [],
      "+": [],
      "#test": [],
      "   ,   ": [],
      "$$beats_fields": [ "+^(host|beat|input|prospector|source|offset|[@]timestamp)($|[.].*)" ],
      "-$$docmeta_fields": [ "-^(_id|_index|_score|_type)$" ],
      "  test1  ": [ "+^test1($|[.].*)" ],
      " +test2,": [ "+^test2($|[.].*)" ],
      "-test2  ": [ "-^test2($|[.].*)" ],
      "-test.2  ": [ "-^test\\.2($|[.].*)" ],
      "-test.*  ": [ "-^test\\..*($|[.].*)" ],
      "t.est*test , test*?tes.t": [ "+^t\\.est.*test($|[.].*)", "+^test.*\\?tes\\.t($|[.].*)" ],
      " /reg.,ex*/": [ "+reg.,ex*" ]
    }
    Object.keys(filterFieldTests).forEach(function(testInStr) {
      var expectedOut = filterFieldTests[testInStr]
      assert.deepEqual(
        AutocompletionManager.TESTONLY.buildFilterFieldRegex_([ testInStr ]), expectedOut, `Regex test ${testInStr}`)
    })

    var fieldFilters = {
      "-*": { inList: ["test"], outList: [] },
      "-stat2.filter_out": {
        inList: ["stat2.filter_out", "stat2.filter_out2", "stat2.filter_out.in", "test", "stat1.filter_out"],
        outList: ["stat2.filter_out2", "test", "stat1.filter_out"]
      },
      "-stat2.*": {
        inList: ["stat2.filter_out", "stat21.field", "stat2.filter_out.in", "test", "stat1.filter_out"],
        outList: ["stat21.field", "test", "stat1.filter_out" ]
      },
      "-stat2.filter*": {
        inList: ["stat2.filter_out"],
        outList: []
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
        callbackFn([])
      } else {
        callbackFn([
          { name: `${indexPattern}_1`, type: "meta1" },
          { name: `${indexPattern}_2`, type: "meta2" },
        ])
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
  })

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test UDF param auto-complete`, function(assert) {
    var didGetCalled = 0
    AutocompletionManager.userDefinedMapReduceParamsCompleter("empty")
      .getCompletions(null, null, null, null, function(unused, wordList) {
        didGetCalled++
        assert.deepEqual(wordList, [], "Param list starts empty")
      })

    var testConfig = {
      aggregation_table: {
        map_reduce: {
          params: { test_param: true }
        }
      }
    }
    AutocompletionManager.registerTableConfig("test_param_lookup", testConfig)
    AutocompletionManager.userDefinedMapReduceParamsCompleter("test_param_lookup")
      .getCompletions(null, null, null, null, function(unused, wordList) {
        didGetCalled++
        var expectedParamList = [
          { caption: "params.test_param", value: "params.test_param", meta: "user-defined parameter" }
        ]
        assert.deepEqual(wordList, expectedParamList, "Param list can be filled")
      })
    AutocompletionManager.clearTableConfigs()
    AutocompletionManager.registerTableConfig("other_lookup", testConfig)
    AutocompletionManager.userDefinedMapReduceParamsCompleter("test_param_lookup")
      .getCompletions(null, null, null, null, function(unused, wordList) {
        didGetCalled++
        assert.deepEqual(wordList, [], "Param list can be cleared")
      })
    testConfig.aggregation_table.enabled = false
    AutocompletionManager.registerTableConfig("test_param_lookup", testConfig)
    AutocompletionManager.userDefinedMapReduceParamsCompleter("test_param_lookup")
      .getCompletions(null, null, null, null, function(unused, wordList) {
        didGetCalled++
        assert.deepEqual(wordList, [], "Param list ignores disabled")
      })
    assert.equal(didGetCalled, 4, "completion callback was called")
  })

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test bucket output auto-complete`, function(assert) {
    var didGetCalled = 0

    AutocompletionManager.aggregationOutputCompleter("empty")
      .getCompletions(null, null, null, null, function(unused, wordList) {
        didGetCalled++
        assert.deepEqual(wordList, [], "Agg output list starts empty")
      })

      var testConfig = {
        aggregation_table: {
          enabled: true,
          buckets: [ { name: "bucket" } ],
          metrics: [ { name: "metric" } ],
          pipelines: [ { name: "pipeline" } ]
        }
      }
      AutocompletionManager.registerTableConfig("test_agg_lookup", testConfig)
      var list = [
        null,
        [ "buckets" ],
        [ "metrics" ],
        [ "pipelines" ]
      ]
      list.forEach(function(filter) {
        var expected = [
          { caption: "bucket", value: "bucket", meta: `aggregation output (buckets)` },
          { caption: "metric", value: "metric", meta: `aggregation output (metrics)` },
          { caption: "pipeline", value: "pipeline", meta: `aggregation output (pipelines)` },
        ]
        expected = expected.filter(function(retVal) {
          return !filter || (retVal.meta.indexOf(filter[0]) >= 0)
        })
        AutocompletionManager.aggregationOutputCompleter("test_agg_lookup", filter)
        .getCompletions(null, null, null, null, function(unused, wordList) {
          didGetCalled++
          assert.deepEqual(wordList, expected, `Agg output + filter matches (${filter})`)
        })
      })
      AutocompletionManager.clearTableConfigs()
      AutocompletionManager.aggregationOutputCompleter("test_agg_lookup")
        .getCompletions(null, null, null, null, function(unused, wordList) {
          didGetCalled++
          assert.deepEqual(wordList, [], "Agg output list can be cleared")
        })

    assert.equal(didGetCalled, 6, "completion callback was called")
  })

  /** Add new script fields to an empty list */
  QUnit.test(`[${testSuiteRoot}] test script fields auto-complete`, function(assert) {
    var didGetCalled = 0

    AutocompletionManager.aggregationOutputCompleter("empty")
      .getCompletions(null, null, null, null, function(unused, wordList) {
        didGetCalled++
        assert.deepEqual(wordList, [], "Script field list starts empty")
      })

      var templateConfig = {
        TEST: {
          enabled: true,
          script_fields: [ { name: "test_field" } ]
        }
      }
      var list = [
        "data_table",
        "aggregation_table"
      ]
      list.forEach(function(path) {
        var testConfig = Util.shallowCopy(templateConfig)
        testConfig[path] = templateConfig.TEST
        delete testConfig.TEST
        AutocompletionManager.registerTableConfig("test_script_field_lookup", testConfig)

        var expectedLabel = [
          { caption: "$$script_field(test_field)", value: "$$script_field(test_field)", meta: `script field` },
        ]
        var expectedField = [
          { caption: "test_field", value: "test_field", meta: `script field` },
        ]
        AutocompletionManager.scriptFieldsCompleter("test_script_field_lookup", "labels")
          .getCompletions(null, null, null, null, function(unused, wordList) {
            didGetCalled++
            assert.deepEqual(wordList, expectedLabel, `Script Field label matches`)
          })
        AutocompletionManager.scriptFieldsCompleter("test_script_field_lookup", "fields")
          .getCompletions(null, null, null, null, function(unused, wordList) {
            didGetCalled++
            assert.deepEqual(wordList, expectedField, `Script Field matches`)
          })
      })
      AutocompletionManager.clearTableConfigs()
      AutocompletionManager.scriptFieldsCompleter("test_script_field_lookup")
        .getCompletions(null, null, null, null, function(unused, wordList) {
          didGetCalled++
          assert.deepEqual(wordList, [], "Script Field list can be cleared")
        })

    assert.equal(didGetCalled, 6, "completion callback was called")
  })

}())
