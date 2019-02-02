/*
 * TestService.gs - contains generic test services
 */

// 0] Global control variables for testing

/** In test mode, UI operations are stubbed out */
var testMode_ = false

/** A list of test methods, each of which should take a sheet and an array and append { name: string } before starting, then { name: string, success: booolean, message: optional_string } when complete */
var testMethods_ = {
   // Code.gs:
   "Code_TESTlaunchElasticsearchTableBuilder": TESTlaunchElasticsearchTableBuilder_,
   "Code_TESTlaunchElasticsearchConfig_": TESTlaunchElasticsearchConfig_,
   // Elasticsearch.gs:
   "ElasticsearchService_configureElasticsearch": TESTconfigureElasticsearch_,
   "ElasticsearchService_getElasticsearchMetadata": TESTgetElasticsearchMetadata_,
   // TableRangeUtils.gs:
   "TableRangeUtils_buildSpecialRowInfo_": TESTbuildSpecialRowInfo_
}

// Each test can add triggers for no-arg functions that are called when the "event" (cf testUiEvents_) is seen
var testUiTriggers_ = {}

/** A log of stubbed out UI events, in the format { "event": string, "metadata": { .. } } */
var testUiEvents_ = []

/** The test sheet name (+ prefix for scratch sheets) */
var testSheetName_ = "__ES_SHEETS_TEST__"

// 1] Generic Test logic

/** Run all the registered tests */
function testRunner() {

   testMode_ = true

   // Recreate test work sheet (deleting any previous tests)
   var ss = SpreadsheetApp.getActive()
   var currTestSheetToDelete = ss.getSheetByName(testSheetName_)
   if (null != currTestSheetToDelete) {
     ss.deleteSheet(currTestSheetToDelete)
   }
   var currActive = ss.getActiveSheet()
   var globalTestSheet = ss.insertSheet(testSheetName_, ss.getNumSheets())
   var startIndex = 1 //(will write summary at the top)

   var success = true
   var numTestsRun = 0
   for (var testName in testMethods_) {

      // Create scratch sheet for this test
      var testSheetName = testSheetName_ + testName
      var currTestSheetToDelete = ss.getSheetByName(testSheetName)
      if (null != currTestSheetToDelete) {
         ss.deleteSheet(currTestSheetToDelete)
      }
      var newSheet = ss.insertSheet(testSheetName, ss.getNumSheets())

      // Clear UI triggers:
      unregisterAllUiHandlers_()

      var test = testMethods_[testName]
      var results = []
      try {
         test(newSheet, results)
      } catch (err) {
         var lastEl = results[results.length - 1] || { success: false }
         if (lastEl.hasOwnProperty("success")) { // outside of test
            lastEl = { name: "unknown" }
            results.push(lastEl)
         }
         lastEl.message = "[EXCEPTION]: [" + err.message + "], stack =\n" + err.stack
         lastEl.success = false
      }
      ss.deleteSheet(newSheet)

      // Render results on spreadsheet

      for (var i in results) {
         numTestsRun++
         var result = results[i]
         success = success && (result.success || false)

         globalTestSheet.getRange("A" + (startIndex + numTestsRun)).setValue(testName + "_" + (result.name || "unknown"))
         globalTestSheet.getRange("B" + (startIndex +numTestsRun)).setValue(result.success || false)
         globalTestSheet.getRange("C" + (startIndex + numTestsRun)).setValue(result.message || "")
      }

   }
   // Final success/failure at the top
   globalTestSheet.getRange("A1").setValue(success)
   globalTestSheet.getRange("B1").setValue("" + numTestsRun)
   globalTestSheet.autoResizeColumn(1)
   globalTestSheet.autoResizeColumn(2)

   // Delete managment sheet
   deleteManagementService_()
}

// 2] Utilities

// 2.1] Top level methods

/** Run each test and handle results, testFn can return a custom message (or nothing) */
function performTest_(testResults, testCaseName, testFn) {
   // Create test-specific management service (repeat check for each test)
   if (null == getManagementService_()) {
     createManagementService_({})
   }
   try {
     var customMessage = testFn() || ""
     testResults.push({ name: testCaseName, success: true, message: customMessage })
  } catch (err) {
     if (err instanceof TestAssertException_) {
       var errMessage = "[FAIL]: " + "[" + testCaseName + "]: [" + err.message + "]"
     } else {
       var errMessage = "[EXCEPTION]: " + "[" + testCaseName +"]: [" + err.message + "], stack =\n" + err.stack
     }
     testResults.push({ name: testCaseName, success: false, message: errMessage })
  }
  // Clear all UI triggers
  testUiEvents_ = []
}

/** Checks if 2 objects are equal and throws a nicely formatted exception message for performTest_ to display if not */
function assertEquals_(expected, actual, context) {
   if (Array.isArray(expected) || (expected === Object(expected))) {
      var expectedCmp = orderedStringify_(expected)
   } else {
      var expectedCmp = expected
   }
   if (Array.isArray(actual) || (actual === Object(actual))) {
      var actualCmp = orderedStringify_(actual)
   } else {
      var actualCmp = actual
   }
   if (expectedCmp != actualCmp) {
      throw new TestAssertException_("Values not equal, context=[" + (context || "none") + "]: expected=[" + expectedCmp + "], actual=[" + actualCmp + "]")
   }
}

/** "Expected" exception indicated a test check fail */
function TestAssertException_(message) {
   this.message = message;
   this.name = 'TestAssertException';
}

// 2.2] UI triggers

/** Registers a callback to be performed when a UI event occurs */
function registerUiHandler_(event, callbackFn) {
   testUiTriggers_[event] = callbackFn
}

/** Unregister a callback to be performed when a UI event occurs */
function unregisterUiHandler_(event, callbackFn) {
   delete testUiTriggers_[event]
}

/** Unregister all callback to be performed when a UI event occurs */
function unregisterAllUiHandlers_() {
   testUiTriggers_ = {}
}

/** In test mode, server code should call this instead of UI operations */
function triggerUiEvent_(event, metadata) {
  testUiEvents_.push({ "event": event, "metadata": metadata })
  if (testUiTriggers_.hasOwnProperty(event)) {
     testUiTriggers_[event](metadata)
  }
}

// 2.3] Useful methods

/** Takes a JSON object - ie subset of JS and deep copies it */
function deepCopyJson_(obj) {
   return JSON.parse(JSON.stringify(obj))
}

/** orders strings while JSONifying */
function orderedStringify_(obj) {
   var allKeys = [];
   JSON.stringify(obj, function(k, v) { allKeys.push(k); return v; })
   return JSON.stringify(obj, allKeys.sort(), 3);
}
