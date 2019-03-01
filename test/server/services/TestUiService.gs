/*
 * Sort-of-Unit/Sort-of-Integration tests for UiService.gs
 */
 /** Run only the tests for this service */
function testUiServiceRunner() {
  TestService_.testRunner("UiService_", /*deleteTestSheets*/true)
}

var TestUiService_ = (function(){

  /** UiService_.TESTONLY.launchElasticsearchTableBuilder_ */
  function launchElasticsearchTableBuilder_(testSheet, testResults) {

    // Check if management service not created, the sidebar app is not brought up
    TestService_.Utils.performTest(testResults, "no_mgmt_service_no_sidebar", function() {

       deleteManagementService_()

       TestService_.registerUiHandler("elasticsearchConfigDialog", function(metadata) {
          //(don't do anything to simulate user clicking cancel)
       })

       UiService_.TESTONLY.launchElasticsearchTableBuilder_()

       TestService_.Utils.assertEquals(true, (getManagementService_() == null), "check no management service")

       var expectedUiTriggerQueue = [{
          event: "elasticsearchConfigDialog", metadata: {
             current_url: "", current_username: "", current_auth_type: "anonymous"
          }
       }]

       TestService_.Utils.assertEquals(expectedUiTriggerQueue, TestService_.getTestUiEvents(), "check only dialog called")
    })

    // Check if management service is created, the sidebar app is brought up
    TestService_.Utils.performTest(testResults, "mgmt_service_creation", function() {

       deleteManagementService_()

       TestService_.registerUiHandler("elasticsearchConfigDialog", function(metadata) {
          //user clicks submit, check that it launches the dialog
          configureElasticsearch(baseEsConfig_)
       })

       UiService_.TESTONLY.launchElasticsearchTableBuilder_()

       TestService_.Utils.assertEquals(true, (getManagementService_() != null), "check management created")

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

       UiService_.TESTONLY.launchElasticsearchTableBuilder_()

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
         setEsMeta_(getManagementService_(), testConfig)

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

  return {
    launchElasticsearchTableBuilder_: launchElasticsearchTableBuilder_,
    launchElasticsearchConfig: launchElasticsearchConfig
  }
}())
TestService_.registerTestSuite("UiService_", TestUiService_)
