/*
 * Sort-of-Unit/Sort-of-Integration tests for UiService.gs
 */
 /** Run only the tests for this service */
function testUiServiceRunner() {
  TestService_.testRunner("UiService_", /*deleteTestSheets*/true)
}

var TestUiService_ = (function(){

  /** UiService_.launchElasticsearchTableBuilder */
  function launchElasticsearchTableBuilder_(testSheet, testResults) {

    // Check if management service not created, the sidebar app is not brought up
    TestService_.Utils.performTest(testResults, "no_mgmt_service_no_sidebar", function() {

       ManagementService_.deleteManagementService()

       TestService_.registerUiHandler("elasticsearchConfigDialog", function(metadata) {
          //(don't do anything to simulate user clicking cancel)
       })

       UiService_.launchElasticsearchTableBuilder()

       TestService_.Utils.assertEquals(false, ManagementService_.isManagementServiceCreated(), "check no management service")

       var expectedUiTriggerQueue = [{
          event: "elasticsearchConfigDialog", metadata: {
             current_url: "", current_username: "", current_auth_type: "anonymous"
          }
       }]

       TestService_.Utils.assertEquals(expectedUiTriggerQueue, TestService_.getTestUiEvents(), "check only dialog called")
    })

    // Check if management service is created, the sidebar app is brought up
    TestService_.Utils.performTest(testResults, "mgmt_service_creation", function() {

       ManagementService_.deleteManagementService()

       TestService_.registerUiHandler("elasticsearchConfigDialog", function(metadata) {
          //user clicks submit, check that it launches the dialog
          configureElasticsearch(baseEsConfig_)
       })

       UiService_.launchElasticsearchTableBuilder()

       TestService_.Utils.assertEquals(true, ManagementService_.isManagementServiceCreated(), "check management created")

       var expectedUiTriggerQueue = [{
          event: "elasticsearchConfigDialog", metadata: {
             current_url: "", current_username: "", current_auth_type: "anonymous"
          }
       },{
          event: "sidebarApp", metadata: {
             default_key: ManagementService_.getDefaultKeyName(),
             selected_table: ""
          }
       }]

       TestService_.Utils.assertEquals(expectedUiTriggerQueue, TestService_.getTestUiEvents(), "check launches")
    })

    // Check if management service is created, the sidebar app is brought up
    TestService_.Utils.performTest(testResults, "sidebar_app_reload", function() {

       UiService_.launchElasticsearchTableBuilder()

       var expectedUiTriggerQueue = [{
          event: "sidebarApp", metadata: {
             default_key: ManagementService_.getDefaultKeyName(),
             selected_table: ""
          }
       }]

       TestService_.Utils.assertEquals(expectedUiTriggerQueue, TestService_.getTestUiEvents(), "check launches")
    })
  }

  /** UiService_.launchElasticsearchConfig */
  function launchElasticsearchConfig(testSheet, testResults) {

    // Check if management service exists then the dialog is pre-populated correctly
    var testMatrix = {
       "anonymous": function(obj) {
          obj.username = ""
          obj.password = ""
          obj.auth_type = "anonymous"
       },
       "password_local": function(obj) {
          obj.username = "test_user"
          obj.password = "test_pass"
          obj.auth_type = "password"
       },
       "password_global": function(obj) {
          obj.username = "test_user"
          obj.password = "test_pass"
          obj.auth_type = "password"
          obj.password_global = true
       }
    }
    for (var subtest in testMatrix) {
      TestService_.Utils.performTest(testResults, "populate_dialog_" + subtest, function() {
         var testConfig = TestService_.Utils.deepCopyJson(baseEsConfig_)
         testMatrix[subtest](testConfig)
         ManagementService_.setEsMeta(testConfig)

         var expectedUiTriggerQueue = [{
            event: "elasticsearchConfigDialog", metadata: {
               current_url: testConfig.url, current_username: testConfig.username, current_auth_type: subtest
            }
         }]
         UiService_.launchElasticsearchConfig()

         TestService_.Utils.assertEquals(expectedUiTriggerQueue, TestService_.getTestUiEvents(), "check only dialog populated correctly")

      })
    }
  }

  ////////////////////////////////////////////////////////

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

  ////////////////////////////////////////////////////////

  return {
    launchElasticsearchTableBuilder_: launchElasticsearchTableBuilder_,
    launchElasticsearchConfig: launchElasticsearchConfig
  }
}())
