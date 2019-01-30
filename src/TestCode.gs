/*
 * Sort-of-Unit/Sort-of-Integration tests for Code.gs
 */

/** (PUBLIC) Code.launchElasticsearchTableBuilder_ */
function TESTlaunchElasticsearchTableBuilder_(testSheet, testResults) {

  // Check if management service not created, the sidebar app is not brought up
  performTest_(testResults, "no_mgmt_service_no_sidebar", function() {

     deleteManagementService_()

     registerUiHandler_("elasticsearchConfigDialog", function(metadata) {
        //(don't do anything to simulate user clicking cancel)
     })

     launchElasticsearchTableBuilder_()

     assertEquals_(true, (getManagementService_() == null), "check no management service")

     var expectedUiTriggerQueue = [{
        event: "elasticsearchConfigDialog", metadata: {
           current_url: "", current_username: "", current_auth_type: "anonymous"
        }
     }]

     assertEquals_(expectedUiTriggerQueue, testUiEvents_, "check only dialog called")
  })

  // Check if management service is created, the sidebar app is brought up
  performTest_(testResults, "mgmt_service_creation", function() {

     deleteManagementService_()

     registerUiHandler_("elasticsearchConfigDialog", function(metadata) {
        //user clicks submit, check that it launches the dialog
        configureElasticsearch(baseEsConfig_)
     })

     launchElasticsearchTableBuilder_()

     assertEquals_(true, (getManagementService_() != null), "check management created")

     var expectedUiTriggerQueue = [{
        event: "elasticsearchConfigDialog", metadata: {
           current_url: "", current_username: "", current_auth_type: "anonymous"
        }
     },{
        event: "sidebarApp", metadata: {
           default_key: defaultTableConfigKey_
        }
     }]

     assertEquals_(expectedUiTriggerQueue, testUiEvents_, "check launches")
  })

  // Check if management service is created, the sidebar app is brought up
  performTest_(testResults, "sidebar_app_reload", function() {

     launchElasticsearchTableBuilder_()

     var expectedUiTriggerQueue = [{
        event: "sidebarApp", metadata: {
           default_key: defaultTableConfigKey_
        }
     }]

     assertEquals_(expectedUiTriggerQueue, testUiEvents_, "check launches")
  })
}

/** (PUBLIC) Code.launchElasticsearchConfig_ */
function TESTlaunchElasticsearchConfig_(testSheet, testResults) {

  // Check if management service exists then the dialog is pre-populated correctly
  var testMatrix = {
     "anonymous": function(obj) {
        obj.username = ""
        obj.password = ""
        obj.auth_type = "anonymous"
     },
     "local_password": function(obj) {
        obj.username = "test_user"
        obj.password = "test_pass"
        obj.auth_type = "password"
     },
     "global_password": function(obj) {
        obj.username = "test_user"
        obj.password = "test_pass"
        obj.auth_type = "password"
        obj.password_global = true
     }
  }
  for (var subtest in testMatrix) {
    performTest_(testResults, "populate_dialog_" + subtest, function() {
       var testConfig = deepCopyJson_(baseEsConfig_)
       testMatrix[subtest](testConfig)
       setEsMeta_(getManagementService_(), testConfig)

       var expectedUiTriggerQueue = [{
          event: "elasticsearchConfigDialog", metadata: {
             current_url: testConfig.url, current_username: testConfig.username, current_auth_type: subtest
          }
       }]
       launchElasticsearchConfig_()

       assertEquals_(expectedUiTriggerQueue, testUiEvents_, "check only dialog populated correctly")

    })
  }

}
