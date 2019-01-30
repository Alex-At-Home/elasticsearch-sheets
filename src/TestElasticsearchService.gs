/*
 * Sort-of-Unit/Sort-of-Integration tests for ElasticsearchService.gs
 */

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

/** (PUBLIC) ElasticsearchService.configureElasticsearch */
function TESTconfigureElasticsearch_(testSheet, testResults) {

  // Check that we create the management service first time
  performTest_(testResults, "mgmt_sheet_created_if_null", function() {
     deleteManagementService_()

     var testConfig = deepCopyJson_(baseEsConfig_)
     configureElasticsearch(testConfig)

     assertEquals_(true, (getManagementService_() != null))
  })

  // anonymous:
  performTest_(testResults, "anonymous", function() {

     deleteManagementService_()

     var testConfig = deepCopyJson_(baseEsConfig_)
     testConfig.auth_type = "anonymous"
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     testConfig.username = ""
     testConfig.password = ""
     assertEquals_(testConfig, newConfig)

  })

  // Local user/password:
  performTest_(testResults, "local_user_pass", function() {

     deleteManagementService_()

     var testConfig = deepCopyJson_(baseEsConfig_)
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     assertEquals_(testConfig, newConfig)

  })

  // Local user/password (password unchanged):
  performTest_(testResults, "local_user_pass", function() {

     deleteManagementService_()

     var testConfig = deepCopyJson_(baseEsConfig_)
     testConfig.password = ""
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     testConfig.password = "pass" // (unchanged)

     assertEquals_(testConfig, newConfig)

  })

  // Global user/password:
  performTest_(testResults, "global_user_pass", function() {

     var testConfig = deepCopyJson_(baseEsConfig_)
     testConfig.password = "pass2"
     testConfig.password_global = true
     configureElasticsearch(testConfig)

     var newConfig = getEsMeta_(getManagementService_())
     assertEquals_(testConfig, newConfig)

  })

  // Safe defaults
  performTest_(testResults, "default_options", function() {

     var testConfig = deepCopyJson_(baseEsConfig_)
     delete testConfig.enabled
     delete testConfig.password_global
     delete testConfig.query_trigger_interval_s
     configureElasticsearch(testConfig)
     testConfig.enabled = true
     testConfig.password_global = false
     testConfig.query_trigger_interval_s = 2

     var newConfig = getEsMeta_(getManagementService_())
     assertEquals_(testConfig, newConfig)

  })
}

/** (PUBLIC) ElasticsearchService.getElasticsearchMetadata */
function TESTgetElasticsearchMetadata_(testSheet, testResults) {
}
