/*
 * Sort-of-Unit/Sort-of-Integration tests for LookupService.gs
 */
 /** Run only the tests for this service */
function testManagementServiceRunner() {
  TestService_.testRunner("ManagementService_", /*deleteTestSheets*/true)
}

var TestManagementService_ = (function(){

  /** The cut down version that comes from the UI */
  var baseUiEsConfig =  {
     "url": "test-url",
     "username": "user",
     "password": "pass",
     "auth_type": "password",
     "password_global": false
  }
  /** (PUBLIC) ManagementService_.setSavedObjectTrigger */
  function setSavedObjectTrigger_(testSheet, testResults) {

    var baseTableConfig = TestService_.Utils.deepCopyJson(defaultTableConfig_)

    TestService_.Utils.performTest(testResults, "trigger_combos", function() {

      // Add a saved object to reason on:
      var name = "setSavedObjectTrigger_1"
      ManagementService_.addSavedObject(name, baseTableConfig)

      var triggerStates = [
        "", "manual", "config_change", "control_change", "content_change"
      ]
      var expectedUpdates = [ //row = current trigger state, col = new trigger state
        [ 1, 1, 1, 1, 1 ],
        [ 1, 1, 0, 0, 0 ],
        [ 1, 1, 1, 0, 0 ],
        [ 1, 1, 1, 1, 0 ],
        [ 1, 1, 1, 1, 1 ]
      ] //1 if i change to _new_ trigger state, 0 otherwise (<0 error)

      var actualUpdates = []
      var actualContext = []
      triggerStates.forEach(function(curr) {
        var actualUpdateRow = []
        triggerStates.forEach(function(newTrigger) {
          ManagementService_.setSavedObjectTrigger(name, "") //(clears)
          ManagementService_.setSavedObjectTrigger(name, curr)
          
          ManagementService_.setSavedObjectTrigger(name, newTrigger)
          var checkResults = ManagementService_.listSavedObjects()
          if (!checkResults.hasOwnProperty(name)) {
            actualUpdateRow.push(-10)
            actualContext.push("[" + name + "] not found")
          } else {
            var updatedTrigger = checkResults[name].temp_trigger || ""
            actualContext.push(updatedTrigger)
            if (updatedTrigger == newTrigger) {
              actualUpdateRow.push(1)
            } else if (updatedTrigger == curr) {
              actualUpdateRow.push(0)
            } else {
              actualUpdateRow.push(-1)
            }
          }
        })
        actualUpdates.push(actualUpdateRow)
      })
      TestService_.Utils.assertEquals(
        expectedUpdates, actualUpdates, JSON.stringify(actualContext)
      )
    })
  }

  return {
    setSavedObjectTrigger_: setSavedObjectTrigger_
  }
}())
