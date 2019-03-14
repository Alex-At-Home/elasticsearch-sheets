/*
 * Sort-of-Unit/Sort-of-Integration tests for ElasticsearchUtils.gs
 */

 function testElasticsearchUtilsRunner() {
    TestService_.testRunner("ElasticsearchUtils_", /*deleteTestSheets*/true)
 }
var TestElasticsearchUtils_ = (function() {

  /** (PRIVATE) ElasticsearchUtils_.buildFilterFieldRegex */
  function buildFilterFieldRegex_(testSheet, testResults) {
    TestService_.Utils.performTest(testResults, "various_usages", function() {
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
         var expectedOut = filterFieldTests[testInStr]
         TestService_.Utils.assertEquals(
           expectedOut, ElasticsearchUtils_.TESTONLY.buildFilterFieldRegex_(testIn), testInStr
         )
       })
    })
  }

  /** (PRIVATE) ElasticsearchUtils_.isFieldWanted_ */
  function isFieldWanted_(testSheet, testResults) {
    TestService_.Utils.performTest(testResults, "various_usages", function() {
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
        var transformedTestIn = ElasticsearchUtils_.TESTONLY.buildFilterFieldRegex_(testIn)
        var inOut = fieldFilters[testInStr] || { inList: [], outList: [] }
        var out = inOut.inList.filter(function(el){
          return ElasticsearchUtils_.TESTONLY.isFieldWanted_(el, transformedTestIn)
        })
        TestService_.Utils.assertEquals(
          inOut.outList, out, testInStr
        )
      })
    })
  }

  /** (PRIVATE) ElasticsearchUtils_.isFieldWanted_ */
  function calculateFilteredCols_(testSheet, testResults) {
    TestService_.Utils.performTest(testResults, "various_usages", function() {
      var filters1 = [
        "/col[34]/",
        "+/col[12][ab]?/",
        "-filter_out"
      ]
      var testCols = [
        { name: "col1" }, //there will match on group2
        { name: "col2a" },
        { name: "col2b" },
        { name: "col3" }, //these will match on group1
        { name: "filter_out" },
        { name: "col4" }
      ]
      var aliases = [
        "col4=Column4",
        "col2b=Column2b",
        "col2a=Column2a",
      ]
      var headerMeta = {
          field_filters: filters1,
          field_aliases: aliases
      }
      var renamedTestCols = [
        "col1", "Column2a", "Column2b", "col3", "filter_out", "Column4"
      ]
      var testCols1 = TestService_.Utils.deepCopyJson(testCols)
      var reorderedList = [ 5, 3, 2, 1, 0 ]
      var result = ElasticsearchUtils_.TESTONLY.calculateFilteredCols_(testCols1, headerMeta)
      var renamed = testCols1.map(function(el) { return el.name })

      TestService_.Utils.assertEquals(
        reorderedList, result, "column order (+ve and -ve)"
      )
      TestService_.Utils.assertEquals(
        renamedTestCols, renamed, "column names (+ve and -ve)"
      )

      // Check no field filters
      headerMeta.field_filters = [ "#" ]
      var testCols2 = TestService_.Utils.deepCopyJson(testCols)
      var defaultReorderedList = [ 5, 2, 1, 0, 3, 4 ]
      var result = ElasticsearchUtils_.TESTONLY.calculateFilteredCols_(testCols2, headerMeta)
      var renamed = testCols2.map(function(el) { return el.name })

      TestService_.Utils.assertEquals(
        defaultReorderedList, result, "column order (no field filters)"
      )
      TestService_.Utils.assertEquals(
        renamedTestCols, renamed, "column names (no field filters)"
      )

      // Check no field aliases
      headerMeta.field_filters = filters1
      headerMeta.field_aliases = []

      var testCols3 = TestService_.Utils.deepCopyJson(testCols)
      var noAliasesReorderedList = [ 3, 5, 0, 1, 2 ]
      var result = ElasticsearchUtils_.TESTONLY.calculateFilteredCols_(testCols3, headerMeta)
      var renamed = testCols3.map(function(el) { return el.name })
      var expectedRenamed = testCols.map(function(el) { return el.name })

      TestService_.Utils.assertEquals(
        noAliasesReorderedList, result, "column order (no field aliases)"
      )
      TestService_.Utils.assertEquals(
        expectedRenamed, renamed, "column names (no field aliases)"
      )
    })
  }

  /** (PUBLIC) ElasticsearchUtils_.buildRowColsFromAggregationResponse */
  function buildRowColsFromAggregationResponse_(testSheet, testResults) {

    var configBuilder = function(config) {
      var bad = { "name": "bad_branch" }
      if (!config.bad_enabled) {
         bad.field_filter = "-"
      }
      var mr1 = { "name": "mr1" }
      if (!config.mr_enabled) {
        mr1.field_filter = "-**"
      }
      var m2 = { "name": "m2", "field_filter": "-stat2.filter_out" }
      if (config.alt_filter) {
         m2.field_filter = "/stat2[.]f[0-9]/"
      }
      return {
        "aggregation_table": {
          "buckets": [
            { "name": "b1" }, { "name": "b2", "filter_field": "t2,/stat[0-9]/,-nothing" }, bad
          ],
          "metrics": [
            { "name": "m1", "field_filter": "-nothing" }, mr1
          ],
          "pipelines": [
            m2
          ]
        }
      }
    }

    var responseBuilder = function(requestConfig, config) {
      var mrBuilder = function(prefix) {
        if (requestConfig.mr_enabled) {
          if (config.mr_atomic && config.mr_array) {
            return [ prefix + 5, prefix + 6 ]
          } else if (config.mr_array){
            return [ { val: prefix + 5 }, { val: prefix + 6 } ]
          } else {
            return { val: prefix + 5 }
          }
        } else {
           return null
        }
      }
      return { "response": { "aggregations": {
        "b1": { "t1": "b1", "buckets": [
        {
          "key": {
            "k1_f1": "k1_b1_f1",
            "k1_f2": "k1_b1_f2"
          },
          "m1": {
            "value": "1"
          },
          "b2": { "buckets": {
            "k1_b2": {
              "m2": {
                "stat2": {
                  "f1": 12,
                  "f2": "yes",
                  "filter_out": 0
                }
              },
              "stat1": 10,
              "mr1": mrBuilder(10)
            },
            "k2_b2": {
              "mr1": mrBuilder(12),
              "stat1": 11,
              "m2": {
                "stat2": {
                  "f1": 13,
                  "filter_out": 0
                }
              }
            }
          }, "t2": "b2a" },
          "bad_branch": { "buckets": [
            {
              "key": "bad",
              "bad_metric": 4
            }
          ]}
        },
        {
          "b2": { "t2": "b2b", "buckets": {
            "k3_b2": {
              "m2": {
                "stat2": {
                  "f1": 22,
                  "f2": "yes",
                  "filter_out": 0
                }
              },
              "stat1": 20,
              "mr1": mrBuilder(20)
            },
            "k4_b2": {
              "stat1": 21,
              "mr1": mrBuilder(22),
              "m2": {
                "stat2": {
                  "f1": 23,
                  "f2": "no",
                  "filter_out": 0
                }
              }
            }
          }},
          "m1": {
            "value": 3
          },
          "key": {
            "k1_f1": "k2_b1_f1",
            "k1_f2": "k2_b1_f2"
          }
        }
      ]}
    }}}
    }

    var resultsBuilder = function(requestConfig, responseConfig) {

      var mrHeaders = []
      if (requestConfig.mr_enabled) {
        if (responseConfig.mr_atomic && responseConfig.mr_array) {
          mrHeaders = [ "mr1.value" ]
        } else {
          mrHeaders = [ "mr1.val" ]
        }
      }
      var headers = [
        "b1.key.k1_f1", "b1.key.k1_f2", "b1.t1", "b2.key", "b2.stat1", "b2.t2", "m1.value"
     ].concat(mrHeaders)
      .concat("m2.stat2.f1", "m2.stat2.f2")
      .map(function(n) { return { name: n } })

      var mr = function(prefix) {
         return requestConfig.mr_enabled ? [ prefix + 5 ] : []
      }
      var rows =
      [
         [ "k1_b1_f1", "k1_b1_f2", "b1", "k1_b2", 10, "b2a", "1" ].concat(mr(10)).concat([12, "yes"]),
         [ "k1_b1_f1", "k1_b1_f2", "b1", "k1_b2", 10, "b2a", "1" ].concat(mr(11)).concat([12, "yes"]), //TODO: handling of bucket siblings isn't ideal here
         [ "k1_b1_f1", "k1_b1_f2", "b1", "k2_b2", 11, "", "1" ].concat(mr(12)).concat([13, ""]),
         [ "k1_b1_f1", "k1_b1_f2", "b1", "k2_b2", 11, "", "1" ].concat(mr(13)).concat([13, ""]),
         [ "k2_b1_f1", "k2_b1_f2", "", "k3_b2", 20, "b2b", 3 ].concat(mr(20)).concat([22, "yes"]),
         [ "k2_b1_f1", "k2_b1_f2", "", "k3_b2", 20, "b2b", 3 ].concat(mr(21)).concat([22, "yes"]),
         [ "k2_b1_f1", "k2_b1_f2", "", "k4_b2", 21, "", 3 ].concat(mr(22)).concat([23, "no"]),
         [ "k2_b1_f1", "k2_b1_f2", "", "k4_b2", 21, "", 3 ].concat(mr(23)).concat([23, "no"])
      ]
      rows = rows.filter(function(el, ii) { return responseConfig.mr_array || (0 == (ii % 2)) })

      return { "cols": headers, "rows": rows }
    }

    TestService_.Utils.performTest(testResults, "no_buckets", function() {
      var requestConfig = { bad_enabled: false, mr_enabled: false, alt_filter: false }
      var tableConfig = configBuilder(requestConfig)
      var mockResults = { response: { aggregations: { "m1": { "v1": 1, "v2": 2 } } } }
      var expectedOutput = { cols: [ { name: "m1.v1" }, { name: "m1.v2" } ], rows: [ [ 1, 2 ]  ]}
      var testOutput = ElasticsearchUtils_.buildRowColsFromAggregationResponse("no_buckets", tableConfig, {}, mockResults, {})
      TestService_.Utils.assertEquals(expectedOutput, testOutput, "simple_input")

      var testOutput = ElasticsearchUtils_.buildRowColsFromAggregationResponse("no_buckets", tableConfig, {}, { response: { aggregations: {} } }, {})
      TestService_.Utils.assertEquals({ rows: [], cols: [] }, testOutput, "empty_input")
    })

    TestService_.Utils.performTest(testResults, "bad_branch", function() {
      [ true, false ].forEach(function(mrEnabled) {
        var requestConfig = { bad_enabled: true, mr_enabled: mrEnabled, alt_filter: false }
        var tableConfig = configBuilder(requestConfig)
        var mockResults = responseBuilder(requestConfig, {mr_atomic: false, mr_array: mrEnabled})
        var expectedPath = mrEnabled ? "[.b1.b2.mr1]" : "[.b1.b2]"
        try {
          var retVal = ElasticsearchUtils_.buildRowColsFromAggregationResponse("bad_branch", tableConfig, {}, mockResults, {})
          TestService_.Utils.assertEquals({}, retVal, "buildRowColsFromAggregationResponse_(...) should throw, not return a result")
        } catch (err) {
          TestService_.Utils.assertEquals(true, err.message.indexOf("[.b1.bad_branch]") > 0, "Error [" + err.message + "] should include right conflict path (mr=[" + mrEnabled + "])")
          TestService_.Utils.assertEquals(true, err.message.indexOf(expectedPath) > 0, "Error [" + err.message + "] should include right conflict path (mr=[" + mrEnabled + "])")
        }
      })
    })

    TestService_.Utils.performTest(testResults, "buckets", function() {
      var requestConfig = { bad_enabled: false, mr_enabled: false, alt_filter: true }
      var tableConfig = configBuilder(requestConfig)
      var mockResults = responseBuilder(requestConfig, {})
      var expectedOutput = resultsBuilder(requestConfig, {})
      var testOutput = ElasticsearchUtils_.buildRowColsFromAggregationResponse("buckets", tableConfig, {}, mockResults, {})
      TestService_.Utils.assertEquals(expectedOutput, testOutput)
    })

    TestService_.Utils.performTest(testResults, "map_reduce", function() {
      var requestConfig = { bad_enabled: false, mr_enabled: true, alt_filter: false }
      var tableConfig = configBuilder({ bad_enabled: false, mr_enabled: true })
      var testCases = [
        { mr_atomic: false, mr_array: false},
        { mr_atomic: false, mr_array: true},
        { mr_atomic: true, mr_array: false},
        { mr_atomic: true, mr_array: true}
      ]
      testCases.forEach(function(caseJson) {
        var mockResults = responseBuilder(requestConfig, caseJson)
        var expectedOutput = resultsBuilder(requestConfig, caseJson)
        var testOutput = ElasticsearchUtils_.buildRowColsFromAggregationResponse("map_reduce", tableConfig, {}, mockResults, {})
        TestService_.Utils.assertEquals(expectedOutput, testOutput, JSON.stringify(caseJson, null, 3))
      })
    })
  }

  ////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////

  return {
    buildFilterFieldRegex_: buildFilterFieldRegex_,
    isFieldWanted_: isFieldWanted_,
    calculateFilteredCols_: calculateFilteredCols_,

    buildRowColsFromAggregationResponse_: buildRowColsFromAggregationResponse_
  }

}())
TestService_.registerTestSuite("ElasticsearchUtils_", TestElasticsearchUtils_)
