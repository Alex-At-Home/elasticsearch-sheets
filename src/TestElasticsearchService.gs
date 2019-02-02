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
}
