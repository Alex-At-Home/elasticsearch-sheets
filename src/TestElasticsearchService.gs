/*
 * Sort-of-Unit/Sort-of-Integration tests for ElasticsearchService.gs
 */

/** Just run the tests in this module */
function testElasticsearchService() {
   testRunner("ElasticsearchService_")
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

   // Utilities
   var buildNamedRange = function(name, a1Notation) {
      var ss = SpreadsheetApp.getActive()
      testSheet.setActiveSelection(a1Notation)
      buildTableRange_(ss, name, {})
      return findTableRange_(ss, name).getRange()
   }
   var defaultA1Notation = "A1:E10"

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
      "": { },
      "Q": { query: "TEST QUERY" },
   }
   var pageTestCases = {
      "": { },
      "P": { page_in: "2", page_out: 2 },
      "BADP": { page_in: "rabbit" },
      "NUMBERP": { page_in: 3, page_out: 3 }
   }

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
   performTest_(testResults, "query_pagination", function() {
      var tableConfig = deepCopyJson_(baseTableConfig)

      // (use named range)
      var range = buildNamedRange("query_pagination", defaultA1Notation)

      tableConfig.common.query.local.position = "top"
      tableConfig.common.query.source = "local"
      tableConfig.common.pagination.local.position = "bottom"
      tableConfig.common.pagination.source = "local"

      var pagePosition = { col: 1, row: 10 }

      var testCases = buildTestCases( [ queryTestCases, pageTestCases ] )
      var testCaseNames = Object.keys(testCases)
      assertEquals_(8, testCaseNames.length, "num_test_cases: " + testCaseNames) // (check we built the expected number of test cases)

      for (var testCaseKey in testCases) {
        var testCaseConfig = testCases[testCaseKey]
        if (testCaseConfig.query) { // write query to the right spot
           range.offset(1, 2).setValue(testCaseConfig.query)
        }
        if (testCaseConfig.page_in) {
           range.offset(pagePosition.row, page.col).setValue(testCaseConfig.page_in)
        }
        var expectedQuery = testCaseConfig.query || ""
        var expectedPage = testCaseConfig.page_out || 1

        var retVal = getElasticsearchMetadata("use_named_range", tableConfig)

        var expectedTableConfig = { data_size: 8, page: expectedPage, query: expectedQuery, page_info_offset: pagePosition }
        assertEquals_(expectedTableConfig, retVal.table_meta, "table_meta" + testCaseKey)

      //TODO: check table fields built
      }
   })
   performTest_(testResults, "query_status_pagination", function() {
      //TODO
   })
   performTest_(testResults, "query_pagination_status", function() {
      //TODO
   })
   performTest_(testResults, "query_pagination_status_nomerge", function() {
      //TODO
   })
   performTest_(testResults, "validation_failure", function() {
      //TODO
   })

   //TODO: top level things to test:
   // status bar: top, merged with query, merged with pagination
   // page specified/not specified
   // query specified/not specified
   // validation: pass/fail
   // Things to check:
   // spreadsheet filled in
   // table meta correct

}
