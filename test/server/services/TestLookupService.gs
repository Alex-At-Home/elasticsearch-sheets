/*
 * Sort-of-Unit/Sort-of-Integration tests for LookupService.gs
 */
 /** Run only the tests for this service */
function testLookupServiceRunner() {
  TestService_.testRunner("LookupService_", /*deleteTestSheets*/true)
}

var TestLookupService_ = (function(){

  /** (PUBLIC) LookupService_.listCandidateDataRanges */
  function listCandidateDataRanges_(testSheet, testResults) {
    TestService_.Utils.performTest(testResults, "various_usages", function() {
      var ss = SpreadsheetApp.getActive()
      var tableName = ManagementService_.managementSheetName() + "__TEST__ignore_me"
      var rangeName = "__TEST__include_me"
      try {
        ManagementService_.deleteManagementService()
        ManagementService_.createManagementService({})

        var tableRange = testSheet.setActiveSelection("A1:C3")
        var range = testSheet.setActiveSelection("D4:F6")
        ss.setNamedRange(tableName, tableRange)
        ss.setNamedRange(rangeName, range)

        var candidateRanges = LookupService_.listCandidateDataRanges().map(function(el) {
          return el.getName()
        })
        var includesTable = candidateRanges.indexOf(tableName) >= 0
        var includesRange = candidateRanges.indexOf(rangeName) >= 0

        TestService_.Utils.assertEquals(false, includesTable, "doesn't return table: " + candidateRanges)
        TestService_.Utils.assertEquals(true, includesRange, "includes non-table range: " + candidateRanges)

      } finally {
        ss.removeNamedRange(tableName)
        ss.removeNamedRange(rangeName)
      }
    })
  }

  /** (PUBLIC) LookupService_.getJsonLookup */
  function getJsonLookup_(testSheet, testResults) {
    TestService_.Utils.performTest(testResults, "various_usages", function() {
      var ss = SpreadsheetApp.getActive()
      var rangeName = "range_test"
      try {
        ManagementService_.deleteManagementService()
        ManagementService_.createManagementService({})

        var a1Notation1 = "D4:G7"
        var a1Notation2 = testSheet.getName() + "!" + a1Notation1
        var inputNotation = testSheet.getName() + "!" + "D4:G8"
        var range = testSheet.setActiveSelection(a1Notation1)
        ss.setNamedRange(rangeName, range)
        var range2 = testSheet.setActiveSelection(inputNotation)
        range2.setValues([
          [ "test1", "", "test2", "test3" ],
          [ "a", "b", false, "c"],
          [ "", "ignore", "ignore", "" ],
          [ "x", "ignore", "d", 3],
          [ "line", "at", "end", 1 ] //(ignored because outside the range)
        ])
        var expected = {
          "a": {
            "test2": false,
            "test3": "c"
          },
          "x": {
            "test2": "d",
            "test3": 3
          }
        }
        var testNames = [ rangeName, a1Notation1, a1Notation2 ]
        testNames.forEach(function(name) {
          TestService_.Utils.assertEquals(
            expected, LookupService_.getJsonLookup(name), name)
        })
      } finally {
        ss.removeNamedRange(rangeName)
      }
    })
  }

  /** (PUBLIC) LookupService_.getNamedRangeOrNotation */
  function getNamedRangeOrNotation_(testSheet, testResults) {
    TestService_.Utils.performTest(testResults, "various_usages", function() {
      var ss = SpreadsheetApp.getActive()
      var rangeName = "range_test"
      try {
        ManagementService_.deleteManagementService()
        ManagementService_.createManagementService({})

        var range = testSheet.setActiveSelection("D4:F6")
        ss.setNamedRange(rangeName, range)

        var matchingRange = testSheet.setActiveSelection("D4:F6")
        TestService_.Utils.assertEquals(
          rangeName,
          LookupService_.getNamedRangeOrNotation(matchingRange),
          "matchingRange"
        )

        var subsetRange = testSheet.setActiveSelection("D4:F5")
        TestService_.Utils.assertEquals(
          subsetRange.getA1Notation(),
          LookupService_.getNamedRangeOrNotation(subsetRange),
          "subsetRange"
        )

        var randomRange = testSheet.setActiveSelection("A1:C3")
        TestService_.Utils.assertEquals(
          randomRange.getA1Notation(),
          LookupService_.getNamedRangeOrNotation(randomRange),
          "randomRange"
        )

      } finally {
        ss.removeNamedRange(rangeName)
      }
    })
  }

  return {
    listCandidateDataRanges_: listCandidateDataRanges_,
    getJsonLookup_: getJsonLookup_,
    getNamedRangeOrNotation_: getNamedRangeOrNotation_
  }
}())
