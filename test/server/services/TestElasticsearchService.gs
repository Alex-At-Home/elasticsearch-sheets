/*
 * Sort-of-Unit/Sort-of-Integration tests for ElasticsearchService.gs
 */

 function testElasticsearchService() {
    TestService_.testRunner("ElasticsearchService_", /*deleteTestSheets*/true)
 //sub-tests:
 //   TestService_.testRunner("ElasticsearchService_build", /*deleteTestSheets*/true)
 }

/** A handy base ES config for use in testing */
var baseEsConfig_ =  {
   "url": "test-url",
   "version": "6.0",
   "username": "user",
   "password": "pass", //(will not normally be populated)
   "auth_type": "password", //"anonymous", "password", in the future: "token", "saml", "oauth" etc
   "password_global": false, // false if stored locally (ie only accessible for given user)
   "header_json": {
      "test_key_header": "test_value_header"
   }, //key, value map
   "client_options_json": {
      "test_key_client": "test_value_client"
   }, //(passed directly to ES client)
   "enabled": true,
   "query_trigger": "test-trigger", //"none", "timed", "popup", "timed_or_popup"
   "query_trigger_interval_s": 10
}

/** The cut down version that comes from the UI */
var baseUiEsConfig_ =  {
   "url": "test-url",
   "username": "user",
   "password": "pass",
   "auth_type": "password",
   "password_global": false
}

/** (utility function) */
function overrideDefaultEsConfig_(overrides) {
   var tmpDefault = TestService_.Utils.deepCopyJson(esMetaModel_)
   for (var key in overrides) {
      tmpDefault[key] = overrides[key]
   }
   return tmpDefault
}

/** (PUBLIC) ElasticsearchService.configureElasticsearch */
function TESTconfigureElasticsearch_(testSheet, testResults) {

  // Check that we create the management service first time
  TestService_.Utils.performTest(testResults, "mgmt_sheet_created_if_null", function() {
     deleteManagementService_()

     var testConfig = TestService_.Utils.deepCopyJson(baseUiEsConfig_)
     configureElasticsearch(testConfig)

     TestService_.Utils.assertEquals(true, (getManagementService_() != null))
  })

  // anonymous:
  TestService_.Utils.performTest(testResults, "anonymous", function() {

     deleteManagementService_()

     var testConfig = TestService_.Utils.deepCopyJson(baseUiEsConfig_)
     testConfig.auth_type = "anonymous"
     testConfig.username = ""
     testConfig.password = ""
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     var expectedConfig = overrideDefaultEsConfig_(testConfig)
     TestService_.Utils.assertEquals(expectedConfig, newConfig)
  })

  // Local user/password:
  TestService_.Utils.performTest(testResults, "local_user_pass", function() {

     deleteManagementService_()

     var testConfig = TestService_.Utils.deepCopyJson(baseUiEsConfig_)
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     var expectedConfig = overrideDefaultEsConfig_(testConfig)
     TestService_.Utils.assertEquals(expectedConfig, newConfig)
  })

  // Global user/password:
  TestService_.Utils.performTest(testResults, "global_user_pass", function() {

     var testConfig = TestService_.Utils.deepCopyJson(baseUiEsConfig_)
     testConfig.password_global = true
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     var expectedConfig = overrideDefaultEsConfig_(testConfig)
     TestService_.Utils.assertEquals(expectedConfig, newConfig)
  })

  // Safe defaults
  TestService_.Utils.performTest(testResults, "full_config_minus_password", function() {

     deleteManagementService_()

     var testConfig = TestService_.Utils.deepCopyJson(baseEsConfig_)
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     TestService_.Utils.assertEquals(testConfig, newConfig)

     // Check can update and not include username/password/auth-type

     var testConfig2 = TestService_.Utils.deepCopyJson(baseEsConfig_)
     testConfig2.url = "new-url"
     delete testConfig2.username
     testConfig2.password = ""
     testConfig2.auth_type = ""
     delete testConfig2.password_global
     configureElasticsearch(testConfig2)

     var newConfig2 = getEsMeta_(getManagementService_())
     testConfig.url = testConfig2.url
     TestService_.Utils.assertEquals(testConfig, newConfig2)
  })
}

/** (PUBLIC) ElasticsearchService.getElasticsearchMetadata */
function TESTgetElasticsearchMetadata_(testSheet, testResults) {

   var baseTableConfig = { "common": {
      "query": {
         "local": {
            "position": "none"
         },
         "source": "local"
      },
      "pagination": {
         "local": {
            "position": "none"
         },
         "source": "local"
      },
      "headers": {
            "position": "none"
      },
      "status": {
            "position": "none",
            "merge": false
      },
      "formatting": {
         "theme": "minimal"
      }
   }}

   var defaultA1Notation = "A1:E10"

   TestService_.Utils.performTest(testResults, "no_special_rows_plus_check_es_meta", function() {
      var tableConfig = TestService_.Utils.deepCopyJson(baseTableConfig)
      // (also test es_meta is filled in correct in this test)
      var testEsConfig = TestService_.Utils.deepCopyJson(baseEsConfig_)
      configureElasticsearch(testEsConfig)
      // (use active selection)
      testSheet.setActiveSelection(defaultA1Notation)

      var retVal = getElasticsearchMetadata("use_active_sheet", tableConfig)

      var expectedEsMeta = overrideDefaultEsConfig_(testEsConfig)
      var expectedTableConfig = { data_size: 10 }
      TestService_.Utils.assertEquals(expectedEsMeta, retVal.es_meta, "es_meta")
      TestService_.Utils.assertEquals(expectedTableConfig, retVal.table_meta, "table_meta")
   })

   TestService_.Utils.performTest(testResults, "validation_failure", function() {
      var tableConfig = TestService_.Utils.deepCopyJson(baseTableConfig)
      tableConfig.common.headers.position = "top" //(ensure needs >1 cell)

      // Single cell:
      testSheet.setActiveSelection("A1:A1")

      var retVal = getElasticsearchMetadata("use_single_cell", tableConfig)
      TestService_.Utils.assertEquals(true, null == retVal, "validation_failed: " + JSON.stringify(retVal || {empty: true}))

      var expectedMessage = "Need at least a 2x1 grid to build this table: [A1] is too small"
      TestService_.Utils.assertEquals(
        [{ event: "toast", metadata: { message: expectedMessage, title: "Server Error" }}],
        TestService_.getTestUiEvents(), 
        "check launches"
      )
   })

   // Now a bunch of similar tests:

   // Utilities
   var buildNamedRange = function(name, a1Notation) {
      var ss = SpreadsheetApp.getActive()
      testSheet.setActiveSelection(a1Notation)
      buildTableRange_(ss, name, {})
      return findTableRange_(ss, name).getRange()
   }

   var buildTestCases = function(testArray) {
      var mergeObjs = function(a, b) {
         var merged = {}
         for (var aa in a) merged[aa] = a[aa]
         for (var bb in b) merged[bb] = b[bb]
         return merged
      }
      var testCases = { "": {} }
      for (var testIndex in testArray) {
         var testCaseFragment = testArray[testIndex]
         var newTestCases = {}
         for (var newK in testCaseFragment) {
            // Combine with all existing keys:
            for (var oldK in testCases) {
               var newComboK = oldK + "_" + newK
               newTestCases[newComboK] = mergeObjs(testCaseFragment[newK], testCases[oldK])
            }
         }
         testCases = newTestCases
      }
      return testCases
   }
   var queryTestCases = {
      "": { query: "" },
      "Q": { query: "TEST QUERY" },
   }
   var pageTestCases = {
      "": { page_out: 1 },
      "P": { page_in: "2", page_out: 2 },
      "BADP": { page_in: "rabbit", page_out: 1 },
      "NUMBERP": { page_in: 3, page_out: 3 }
   }
   var formatTestsCases = {
      "": { format: false },
      "F": { format: true }
   }
   var tests = {
     "query_pagination": {},
     "query_status_pagination": { status: "top", merge: true },
     "pagination_status": { status: "bottom", merge: true },
     "query_status_pagination_nomerge": { status: "bottom", merge: false }
   }

   var testRunner = function(testName, testConfig) { TestService_.Utils.performTest(testResults, testName, function() {
      var tableConfig = TestService_.Utils.deepCopyJson(baseTableConfig)

      // (use named range)
      var range = buildNamedRange(testName, defaultA1Notation)

      var includeQueryBar = testName.indexOf("query") >= 0
      var includePagination = testName.indexOf("pagination") >= 0
      var includeStatus = testName.indexOf("status") >= 0

      //TODO: also runs some test where this is true
      var testMode = false

      var expectedDataSize = 10
      var numTestCases = 1
      var testCaseInfoArray = []
      if (includeQueryBar) {
         expectedDataSize--
         numTestCases *= Object.keys(queryTestCases).length
         testCaseInfoArray.push(queryTestCases)
         tableConfig.common.query.local.position = "top"
         tableConfig.common.query.source = "local"
      }
      var pagePosition = { col: 2, row: 10 }
      if (includePagination) {
         expectedDataSize--
         numTestCases *= Object.keys(pageTestCases).length
         testCaseInfoArray.push(pageTestCases)
         tableConfig.common.pagination.local.position = "bottom"
         tableConfig.common.pagination.source = "local"
      }
      var statusPosition = { }
      if (includeStatus) {
         if (!testConfig.merge) {
            expectedDataSize--
            statusPosition.col = 2
            statusPosition.row = ("top" == testConfig.status)  ?
               (includeQueryBar ? 2 : 1) :
               (includePagination ? 9 : 10)
         } else { //top means merge with query bar, bottom means merge with pagination
            statusPosition.col = ("top" == testConfig.status) ? 5 : 4
            statusPosition.row = ("top" == testConfig.status) ? 1 : 10
         }
         tableConfig.common.status.position = testConfig.status
         tableConfig.common.status.merge = testConfig.merge
      }
      if (testName.indexOf("query_status_pagination" >= 0)) { //(covers all the cases)
         testCaseInfoArray.push(formatTestsCases)
         numTestCases *= Object.keys(formatTestsCases).length
      }

      var testCases = buildTestCases(testCaseInfoArray)
      var testCaseNames = Object.keys(testCases)
      TestService_.Utils.assertEquals(numTestCases, testCaseNames.length, "num_test_cases: " + testCaseNames) // (check we built the expected number of test cases)

      for (var testCaseKey in testCases) {
        var testCaseConfig = testCases[testCaseKey]
        range.clear()
        if (includeQueryBar) {
           // query always set - default means "", so write to the right spot
           range.getCell(1, 1).setValue("Query:")
           range.getCell(1, 2).setValue(testCaseConfig.query)
        }
        if (includePagination) {
           // set pagination
           range.getCell(pagePosition.row, pagePosition.col - 1).setValue("Page (test)")
           if (1 != testCaseConfig.page_in) { //1 is defaunt, so clear out to test it gets put back in
              range.getCell(pagePosition.row, pagePosition.col).setValue(testCaseConfig.page_in)
           } else {
              range.getCell(pagePosition.row, pagePosition.col).setValue("")
           }
        }
        if (!testCaseConfig.format) {
           tableConfig.common.formatting.theme = "none"
        } else {
           tableConfig.common.formatting.theme = "minimal"
        }
        var expectedQuery = testCaseConfig.query
        var expectedPage = testCaseConfig.page_out

        var retVal = getElasticsearchMetadata("use_named_range", tableConfig, testMode)

        var expectedTableConfig = { data_size: expectedDataSize, page: expectedPage, query: expectedQuery }
        if (includePagination) {
           expectedTableConfig.page_info_offset = pagePosition
        }
        if (includeStatus) {
           expectedTableConfig.status_offset = statusPosition
        }
        var extraTestCaseConfig = " / " + testCaseKey + ": " + JSON.stringify(testCaseConfig)
        TestService_.Utils.assertEquals(expectedTableConfig, retVal.table_meta, "table_meta" + extraTestCaseConfig)

        var cellFontWeight = "bold"
        if (!testCaseConfig.format) {
           cellFontWeight = "normal"
        }

        // Check the table contents:
        var expectedMerges = []
        if (includeQueryBar) {
           TestService_.Utils.assertEquals("Query:", range.getCell(1, 1).getValue(), "query text" + extraTestCaseConfig)
           TestService_.Utils.assertEquals(cellFontWeight, range.getCell(1, 1).getFontWeight(), "query text format" + extraTestCaseConfig)
           TestService_.Utils.assertEquals(expectedQuery, range.getCell(1, 2).getValue(), "query value" + extraTestCaseConfig)
           if (("top" == testConfig.status) && testConfig.merge) {
              expectedMerges.push("B1:C1")
           } else {
              expectedMerges.push("B1:E1")
           }
        }
        if (includePagination) {
           TestService_.Utils.assertEquals("Page (of ???):", range.getCell(pagePosition.row, pagePosition.col - 1).getValue(), "page text" + extraTestCaseConfig)
           TestService_.Utils.assertEquals(cellFontWeight, range.getCell(pagePosition.row, pagePosition.col - 1).getFontWeight(), "page text format" + extraTestCaseConfig)
           TestService_.Utils.assertEquals(expectedPage, range.getCell(pagePosition.row, pagePosition.col).getValue(), "page value" + extraTestCaseConfig)
        }
        if (includeStatus) {
           TestService_.Utils.assertEquals("Status:", range.getCell(statusPosition.row, statusPosition.col - 1).getValue(), "status text" + extraTestCaseConfig)
           TestService_.Utils.assertEquals(cellFontWeight, range.getCell(statusPosition.row, statusPosition.col - 1).getFontWeight(), "status text format + extraTestCaseConfig")
           var statusShouldBePending = range.getCell(statusPosition.row, statusPosition.col).getValue()
           TestService_.Utils.assertEquals(true, 0 == statusShouldBePending.indexOf("PENDING"), "status value: " + statusShouldBePending + extraTestCaseConfig)
           if (!testConfig.merge) {
              expectedMerges.push("B9:E9")
           } else if ("bottom" == testConfig.status) {
              expectedMerges.push("D10:E10")
           }
        }
        // Check formatting:
        //TODO: check header formats
        var mergedRanges = range.getMergedRanges()
        if (testCaseConfig.format) {
           TestService_.Utils.assertEquals(expectedMerges, mergedRanges.map(function(x){ return x.getA1Notation() }), "merge range span" + extraTestCaseConfig)
        } else {
           TestService_.Utils.assertEquals([], mergedRanges.map(function(x){ return x.getA1Notation() }), "merge range span" + extraTestCaseConfig)
        }
      }
   })}
   for (var testName in tests) {
     var testConfig = tests[testName]
     testRunner(testName, testConfig)
   }
   //TODO: tests for fixing formatting when switching between common options - just don't clear format between runs maybe?
   // and then check that the
}

/** (PUBLIC) ElasticsearchService.handleSqlResults */
function TESThandleSqlResults_(testSheet, testResults) {
   //TODO: list things to test
   // - dummy data gets written
   // - page info updated
   // - warnings and errors
   // - clears rest of data
}

/** (PUBLIC) ElasticsearchService.buildAggregationQuery */
function TESTbuildAggregationQuery_(testSheet, testResults) {

  var baseConfig = {
     "aggregation_table": {
       "map_reduce": {
          "params": {
             "k1": "v1"
          },
          "lib": "l",
          "init": "i",
          "map": "m",
          "combine": "c",
          "reduce": "r"
       },
       "query": {
          "query": { "testqk": "testqv:$$query" }
       },
       "buckets": [
         { }, //(skip, no name)

         { "name": "n1", "agg_type": "t1", "config": { "ck1": "cv1" }, "location": "automatic" },
         { "name": "n2", "agg_type": "t2", "location": "n3" },
         { "name": "n3", "agg_type": "t3", "config": { "ck3": "cv3" } }
       ],
       "metrics": [
         { "name": "n4", "agg_type": "t4", "config": { "ck4": "cv4" } },
         { "name": "n5", "agg_type": "__map_reduce__", "config": { "ck5": "cv5" }, "location": "n2" },

         { "name": "testname", "agg_type": "testtype", "location": "disabled" } //(skip, disabled)
       ],
       "pipelines": [
         { "name": "n6", "agg_type": "__map_reduce__", "config": { "ck6": "cv6" } },

         { "name": "testname", "agg_type": "testtype", "location": "disabled" }, //(skip, disabled)

         { "name": "n7", "agg_type": "t7", "config": { "ck7": "cv7" }, "location": "n1" }
       ]
     }
  }

  TestService_.Utils.performTest(testResults, "no duplicates", function() {
    try {
      badConfig = {
         "aggregation_table": {
           "buckets": [
             { "name": "dup1", config: {} }
           ],
           "metrics": [
             { "name": "dup1", config: {} }
           ]
         }
       }
       buildAggregationQuery(badConfig, "")
       TestService_.Utils.assertEquals(true, false, "buildAggregationQuery(badConfig) should throw")
    } catch(err) {}
  })

  TestService_.Utils.performTest(testResults, "no reserved bucket names", function() {
    try {
      badConfig = {
         "aggregation_table": {
           "buckets": [
             { "name": "buckets", config: {} }
           ],
           "metrics": [
             { "name": "dup1", config: {} }
           ]
         }
       }
       buildAggregationQuery(badConfig, "")
       TestService_.Utils.assertEquals(true, false, "buildAggregationQuery(badConfig) should throw")
    } catch(err) {}
  })

  TestService_.Utils.performTest(testResults, "normal_usage", function() {
     var postBody = buildAggregationQuery(baseConfig, "\"*\"")

     var expectedBody = {
       "aggregations": {
          "n1": {
             "aggregations": {
                "n3": {
                   "aggregations": {
                      "n2": {
                         "aggregations": {
                            "n5": {
                               "scripted_metric": {
                                  "combine_script": "l\n\nc",
                                  "init_script": "l\n\ni",
                                  "map_script": "l\n\nm",
                                  "params": {
                                     "_name_": "n5",
                                     "ck5": "cv5",
                                     "k1": "v1"
                                  },
                                  "reduce_script": "l\n\nr"
                               }
                            }
                         },
                         "t2": {}
                      },
                      "n4": {
                         "t4": {
                            "ck4": "cv4"
                         }
                      },
                      "n6": {
                         "scripted_metric": {
                            "combine_script": "l\n\nc",
                            "init_script": "l\n\ni",
                            "map_script": "l\n\nm",
                            "params": {
                               "_name_": "n6",
                               "ck6": "cv6",
                               "k1": "v1"
                            },
                            "reduce_script": "l\n\nr"
                         }
                      }
                   },
                   "t3": {
                      "ck3": "cv3"
                   }
                },
                "n7": {
                   "t7": {
                      "ck7": "cv7"
                   }
                }
             },
             "t1": {
                "ck1": "cv1"
             }
          }
       },
       "query": {
          "testqk": "testqv:\"*\""
       },
       "size": 0
    }
    TestService_.Utils.assertEquals(expectedBody, postBody)
  })
}

/** (PRIVATE) ElasticsearchService.buildFilterFieldRegex_ */
function TESTbuildFilterFieldRegex_(testSheet, testResults) {
  TestService_.Utils.performTest(testResults, "various_usages", function() {
     var filterFieldTests = {
       "-": [],
       "+": [],
       "   ": [],
       "  test1  ": [ "+test1" ],
       " +test2,": [ "+test2" ],
       "-test2  ": [ "-test2" ],
       "-test.2  ": [ "-test\\.2" ],
       "t.est*test , test**tes.t": [ "+t\\.est[^.]*test", "+test.*tes\\.t" ],
       " /reg.ex*/": [ "+reg.ex*" ],
       "-/regex**/": [ "-regex**" ]
     }
     Object.keys(filterFieldTests).forEach(function(testIn) {
       var expectedOut = filterFieldTests[testIn]
       TestService_.Utils.assertEquals(expectedOut, buildFilterFieldRegex_(testIn), testIn)
     })
  })
}

/** (PRIVATE) ElasticsearchService.buildRowColsFromAggregationResponse_ */
function TESTbuildRowColsFromAggregationResponse_(testSheet, testResults) {

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
    var testOutput = buildRowColsFromAggregationResponse_("no_buckets", tableConfig, {}, mockResults, {})
    TestService_.Utils.assertEquals(expectedOutput, testOutput, "simple_input")

    var testOutput = buildRowColsFromAggregationResponse_("no_buckets", tableConfig, {}, { response: { aggregations: {} } }, {})
    TestService_.Utils.assertEquals({ rows: [], cols: [] }, testOutput, "empty_input")
  })

  TestService_.Utils.performTest(testResults, "bad_branch", function() {
    [ true, false ].forEach(function(mrEnabled) {
      var requestConfig = { bad_enabled: true, mr_enabled: mrEnabled, alt_filter: false }
      var tableConfig = configBuilder(requestConfig)
      var mockResults = responseBuilder(requestConfig, {mr_atomic: false, mr_array: mrEnabled})
      var expectedPath = mrEnabled ? "[.b1.b2.mr1]" : "[.b1.b2]"
      try {
        var retVal = buildRowColsFromAggregationResponse_("bad_branch", tableConfig, {}, mockResults, {})
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
    var testOutput = buildRowColsFromAggregationResponse_("buckets", tableConfig, {}, mockResults, {})
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
      var testOutput = buildRowColsFromAggregationResponse_("map_reduce", tableConfig, {}, mockResults, {})
      TestService_.Utils.assertEquals(expectedOutput, testOutput, JSON.stringify(caseJson, null, 3))
    })
  })

}
