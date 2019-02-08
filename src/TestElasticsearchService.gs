/*
 * Sort-of-Unit/Sort-of-Integration tests for ElasticsearchService.gs
 */

/** Just run the tests in this module */
function testElasticsearchService() {
   testRunner_("ElasticsearchService_", /*deleteTestSheets*/true)
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
   var tmpDefault = deepCopyJson_(esMetaModel_)
   for (var key in overrides) {
      tmpDefault[key] = overrides[key]
   }
   return tmpDefault
}

/** (PUBLIC) ElasticsearchService.configureElasticsearch */
function TESTconfigureElasticsearch_(testSheet, testResults) {

  // Check that we create the management service first time
  performTest_(testResults, "mgmt_sheet_created_if_null", function() {
     deleteManagementService_()

     var testConfig = deepCopyJson_(baseUiEsConfig_)
     configureElasticsearch(testConfig)

     assertEquals_(true, (getManagementService_() != null))
  })

  // anonymous:
  performTest_(testResults, "anonymous", function() {

     deleteManagementService_()

     var testConfig = deepCopyJson_(baseUiEsConfig_)
     testConfig.auth_type = "anonymous"
     testConfig.username = ""
     testConfig.password = ""
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     var expectedConfig = overrideDefaultEsConfig_(testConfig)
     assertEquals_(expectedConfig, newConfig)
  })

  // Local user/password:
  performTest_(testResults, "local_user_pass", function() {

     deleteManagementService_()

     var testConfig = deepCopyJson_(baseUiEsConfig_)
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     var expectedConfig = overrideDefaultEsConfig_(testConfig)
     assertEquals_(expectedConfig, newConfig)
  })

  // Global user/password:
  performTest_(testResults, "global_user_pass", function() {

     var testConfig = deepCopyJson_(baseUiEsConfig_)
     testConfig.password_global = true
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     var expectedConfig = overrideDefaultEsConfig_(testConfig)
     assertEquals_(expectedConfig, newConfig)
  })

  // Safe defaults
  performTest_(testResults, "full_config_minus_password", function() {

     deleteManagementService_()

     var testConfig = deepCopyJson_(baseEsConfig_)
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     assertEquals_(testConfig, newConfig)

     // Check can update and not include username/password/auth-type

     var testConfig2 = deepCopyJson_(baseEsConfig_)
     testConfig2.url = "new-url"
     delete testConfig2.username
     testConfig2.password = ""
     testConfig2.auth_type = ""
     delete testConfig2.password_global
     configureElasticsearch(testConfig2)

     var newConfig2 = getEsMeta_(getManagementService_())
     testConfig.url = testConfig2.url
     assertEquals_(testConfig, newConfig2)
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
      }
   }}

   var defaultA1Notation = "A1:E10"

   performTest_(testResults, "no_special_rows_plus_check_es_meta", function() {
      var tableConfig = deepCopyJson_(baseTableConfig)
      // (also test es_meta is filled in correct in this test)
      var testEsConfig = deepCopyJson_(baseEsConfig_)
      configureElasticsearch(testEsConfig)
      // (use active selection)
      testSheet.setActiveSelection(defaultA1Notation)

      var retVal = getElasticsearchMetadata("use_active_sheet", tableConfig)

      var expectedEsMeta = overrideDefaultEsConfig_(testEsConfig)
      var expectedTableConfig = { data_size: 10 }
      assertEquals_(expectedEsMeta, retVal.es_meta, "es_meta")
      assertEquals_(expectedTableConfig, retVal.table_meta, "table_meta")
   })

   performTest_(testResults, "validation_failure", function() {
      var tableConfig = deepCopyJson_(baseTableConfig)
      tableConfig.common.headers.position = "top" //(ensure needs >1 cell)

      // Single cell:
      testSheet.setActiveSelection("A1:A1")

      var retVal = getElasticsearchMetadata("use_single_cell", tableConfig)
      assertEquals_(true, null == retVal, "validation_failed: " + JSON.stringify(retVal || {empty: true}))

      var expectedMessage = "Need at least a 2x1 grid to build this table: [A1] is too small"
      assertEquals_([{ event: "toast", metadata: { message: expectedMessage, title: "Server Error" }}], testUiEvents_, "check launches")
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
   var tests = {
     "query_pagination": {},
     "query_status_pagination": { status: "top", merge: true },
     "pagination_status": { status: "bottom", merge: true },
     "query_status_pagination_nomerge": { status: "bottom", merge: false }
   }

   var testRunner = function(testName, testConfig) { performTest_(testResults, testName, function() {
      var tableConfig = deepCopyJson_(baseTableConfig)

      // (use named range)
      var range = buildNamedRange(testName, defaultA1Notation)

      var includeQueryBar = testName.indexOf("query") >= 0
      var includePagination = testName.indexOf("pagination") >= 0
      var includeStatus = testName.indexOf("status") >= 0

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
      var pagePosition = { col: 1, row: 10 }
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
         } else {
            statusPosition.col = 5
            statusPosition.row = ("top" == testConfig.status) ? 1 : 10
         }
         tableConfig.common.status.position = testConfig.status
         tableConfig.common.status.merge = testConfig.merge
      }

      var testCases = buildTestCases(testCaseInfoArray)
      var testCaseNames = Object.keys(testCases)
      assertEquals_(numTestCases, testCaseNames.length, "num_test_cases: " + testCaseNames) // (check we built the expected number of test cases)

      for (var testCaseKey in testCases) {
        var testCaseConfig = testCases[testCaseKey]
        range.clear()
        if (includeQueryBar) {
           // query always set - default means "", so write to the right spot
           range.getCell(1, 2).setValue(testCaseConfig.query)
        }
        if (includePagination) {
           // set pagination
           if (1 != testCaseConfig.page_in) { //1 is defaunt, so clear out to test it gets put back in
              range.getCell(pagePosition.row, pagePosition.col).setValue(testCaseConfig.page_in)
           } else {
              range.getCell(pagePosition.row, pagePosition.col).setValue("")
           }
        }
        var expectedQuery = testCaseConfig.query
        var expectedPage = testCaseConfig.page_out

        var retVal = getElasticsearchMetadata("use_named_range", tableConfig)

        var expectedTableConfig = { data_size: expectedDataSize, page: expectedPage, query: expectedQuery }
        if (includePagination) {
           expectedTableConfig.page_info_offset = pagePosition
        }
        if (includeStatus) {
           expectedTableConfig.status_offset = statusPosition
        }
        assertEquals_(expectedTableConfig, retVal.table_meta, "table_meta" + testCaseKey + ": " + JSON.stringify(testCaseConfig))

        // Check the table contents:
        var expectedMerges = []
        if (includeQueryBar) {
           assertEquals_("Query:", range.getCell(1, 1).getValue(), "query text")
           assertEquals_(expectedQuery, range.getCell(1, 2).getValue(), "query value")
           if (("top" == testConfig.status) && testConfig.merge) {
              expectedMerges.push("B1:C1")
           } else {
              expectedMerges.push("B1:E1")
           }
        }
        if (includePagination) {
           assertEquals_("of ???", range.getCell(pagePosition.row, pagePosition.col + 1).getValue(), "page text")
           assertEquals_(expectedPage, range.getCell(pagePosition.row, pagePosition.col).getValue(), "page value")
        }
        if (includeStatus) {
           assertEquals_("Status:", range.getCell(statusPosition.row, statusPosition.col - 1).getValue(), "status text")
           var statusShouldBePending = range.getCell(statusPosition.row, statusPosition.col).getValue()
           assertEquals_(true, 0 == statusShouldBePending.indexOf("PENDING"), "status value: " + statusShouldBePending)
           if (!testConfig.merge) {
              expectedMerges.push("B9:E9")
           }
        }
        // Check formatting:
        var mergedRanges = range.getMergedRanges()
        assertEquals_(expectedMerges, mergedRanges.map(function(x){ return x.getA1Notation() }), "merge range span")
      }
   })}
   for (var testName in tests) {
     var testConfig = tests[testName]
     testRunner(testName, testConfig)
   }

}
