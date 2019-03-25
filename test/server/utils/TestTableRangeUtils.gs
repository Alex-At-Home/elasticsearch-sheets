/*
 * Sort-of-Unit/Sort-of-Integration tests for TableRangeUtils.gs
 */

 /** Run only the tests for this service */
function testTableRangeUtilsRunner() {
  TestService_.testRunner("TableRangeUtils_", /*deleteTestSheets*/true)
}
var TestTableRangeUtils_ = (function(){

  /** (PRIVATE) TableRangeUtils.buildSpecialRowInfo */
  function buildSpecialRowInfo_(testSheet, testResults) {
     //TODO: handle skip rows/cols
     var baseUiInput = { "common": {
        "query": { // Qq
           "local": {
              "position": "none"
           },
           "source": "local"
        },
        "pagination": { // Pp
           "local": {
              "position": "none"
           },
           "source": "local"
        },
        "headers": { // Hh
              "position": "none"
        },
        "status": { // SsMm
              "position": "none",
              "merge": false
        }

     }}
     var buildInput = function(code, merge) {
        var tmp = TestService_.Utils.deepCopyJson(baseUiInput)
        if (code.indexOf("Q") >= 0) {
           tmp.common.query.local.position = "top"
        } else if (code.indexOf("q") >= 0) {
           tmp.common.query.local.position = "bottom"
        }
        if (code.indexOf("P") >= 0) {
           tmp.common.pagination.local.position = "top"
        } else if (code.indexOf("p") >= 0) {
           tmp.common.pagination.local.position = "bottom"
        }
        if (code.indexOf("H") >= 0) {
           tmp.common.headers.position = "top"
        } else if (code.indexOf("h") >= 0) {
           tmp.common.headers.position = "bottom"
        }
        if (code.indexOf("S") >= 0) {
           tmp.common.status.position = "top"
        } else if (code.indexOf("s") >= 0) {
           tmp.common.status.position = "bottom"
        }
        if (merge) {
           tmp.common.status.merge = true
        }
        return tmp
     }
     var inputVsOutputNoMerge = { // Some combo of choices that demonstrates all the logic
       //(order is query_bar, pagination, status, headers)
       "": { query_bar: 0, status: 0, headers: 0, pagination: 0, is_merged: false, min_height: 1, min_width: 1, skip_rows: [], skip_cols: [] },

       "Q": { query_bar: 1, status: 0, headers: 0, pagination: 0, is_merged: false, min_height: 2, min_width: 2, skip_rows: [], skip_cols: [] },
       "q": { query_bar: -1, status: 0, headers: 0, pagination: 0, is_merged: false, min_height: 2, min_width: 2, skip_rows: [], skip_cols: [] },
       "S": { query_bar: 0, status: 1, headers: 0, pagination: 0, is_merged: false, min_height: 2, min_width: 2, skip_rows: [], skip_cols: [] },
       "s": { query_bar: 0, status: -1, headers: 0, pagination: 0, is_merged: false, min_height: 2, min_width: 2, skip_rows: [], skip_cols: [] },
       "H": { query_bar: 0, status: 0, headers: 1, pagination: 0, is_merged: false, min_height: 2, min_width: 1, skip_rows: [], skip_cols: [] },
       "h": { query_bar: 0, status: 0, headers: -1, pagination: 0, is_merged: false, min_height: 2, min_width: 1, skip_rows: [], skip_cols: [] },
       "P": { query_bar: 0, status: 0, headers: 0, pagination: 1, is_merged: false, min_height: 2, min_width: 2, skip_rows: [], skip_cols: [] },
       "p": { query_bar: 0, status: 0, headers: 0, pagination: -1, is_merged: false, min_height: 2, min_width: 2, skip_rows: [], skip_cols: [] },

       "QS": { query_bar: 1, status: 2, headers: 0, pagination: 0, is_merged: false, min_height: 3, min_width: 2, skip_rows: [], skip_cols: [] },
       "qS": { query_bar: -1, status: 1, headers: 0, pagination: 0, is_merged: false, min_height: 3, min_width: 2, skip_rows: [], skip_cols: [] },
       "SH": { query_bar: 0, status: 1, headers: 2, pagination: 0, is_merged: false, min_height: 3, min_width: 2, skip_rows: [], skip_cols: [] },
       "Sh": { query_bar: 0, status: 1, headers: -1, pagination: 0, is_merged: false, min_height: 3, min_width: 2, skip_rows: [], skip_cols: [] },
       "QP": { query_bar: 1, status: 0, headers: 0, pagination: 2, is_merged: false, min_height: 3, min_width: 2, skip_rows: [], skip_cols: [] },
       "sp": { query_bar: 0, status: -2, headers: 0, pagination: -1, is_merged: false, min_height: 3, min_width: 2, skip_rows: [], skip_cols: [] },

       "QSH": { query_bar: 1, status: 2, headers: 3, pagination: 0, is_merged: false, min_height: 4, min_width: 2, skip_rows: [], skip_cols: [] },
       "QSP": { query_bar: 1, status: 3, headers: 0, pagination: 2, is_merged: false, min_height: 4, min_width: 2, skip_rows: [], skip_cols: [] },
       "shp": { query_bar: 0, status: -2, headers: -3, pagination: -1, is_merged: false, min_height: 4, min_width: 2, skip_rows: [], skip_cols: [] },
       "Qhp": { query_bar: 1, status: 0, headers: -2, pagination: -1, is_merged: false, min_height: 4, min_width: 2, skip_rows: [], skip_cols: [] },
       "ShP": { query_bar: 0, status: 2, headers: -1, pagination: 1, is_merged: false, min_height: 4, min_width: 2, skip_rows: [], skip_cols: [] },

       "QSHP": { query_bar: 1, status: 3, headers: 4, pagination: 2, is_merged: false, min_height: 5, min_width: 2, skip_rows: [], skip_cols: [] },
       "qshp": { query_bar: -1, status: -3, headers: -4, pagination: -2, is_merged: false, min_height: 5, min_width: 2, skip_rows: [], skip_cols: [] },
       "qsHP": { query_bar: -1, status: -2, headers: 2, pagination: 1, is_merged: false, min_height: 5, min_width: 2, skip_rows: [], skip_cols: [] },
       "QShP": { query_bar: 1, status: 3, headers: -1, pagination: 2, is_merged: false, min_height: 5, min_width: 2, skip_rows: [], skip_cols: [] },
       "qshP": { query_bar: -1, status: -2, headers: -3, pagination: 1, is_merged: false, min_height: 5, min_width: 2, skip_rows: [], skip_cols: [] },
     }
     // First off, check defaults quickly
     TestService_.Utils.performTest(testResults, "check_defaults", function() {
        TestService_.Utils.assertEquals(inputVsOutputNoMerge[""], TableRangeUtils_.buildSpecialRowInfo({}), "{}")
        var pqNoSource = TestService_.Utils.deepCopyJson(buildInput("PQ", /*merge*/false))
        // Check ignores pagination and queries if source not set
        delete pqNoSource.common.query.source
        delete pqNoSource.common.pagination.source
        TestService_.Utils.assertEquals(inputVsOutputNoMerge[""], TableRangeUtils_.buildSpecialRowInfo(pqNoSource), "{}")
     })
     // Now check all combos:
     TestService_.Utils.performTest(testResults, "combo_test_nomerge", function() {
        for (var subTest in inputVsOutputNoMerge) {
           var input = buildInput(subTest, /*merge*/false)
           TestService_.Utils.assertEquals(inputVsOutputNoMerge[subTest], TableRangeUtils_.buildSpecialRowInfo(input), subTest + "[" + JSON.stringify(input) + "]")
        }
     })
     TestService_.Utils.performTest(testResults, "combo_test_merge", function() {
        var adjustForMerge = function(toMod, modJson) {
           for (var k in modJson) {
              toMod[k] = modJson[k]
           }
           toMod.is_merged = true
           toMod.min_width = 4
           toMod.min_height--
        }
        var inputVsOutputMerge = TestService_.Utils.deepCopyJson(inputVsOutputNoMerge)
        // All the fields that are different if merging:
        // (status merges with pagination if possible, else query)
        adjustForMerge(inputVsOutputMerge["QS"], { status: 1 })
        adjustForMerge(inputVsOutputMerge["sp"], { status: -1 })
        adjustForMerge(inputVsOutputMerge["QSH"], { status: 1, headers: 2 })
        adjustForMerge(inputVsOutputMerge["QSP"], { status: 2 })
        adjustForMerge(inputVsOutputMerge["shp"], { status: -1, headers: -2 })
        adjustForMerge(inputVsOutputMerge["ShP"], { status: 1 })
        adjustForMerge(inputVsOutputMerge["QSHP"], { status: 2, headers: 3 })
        adjustForMerge(inputVsOutputMerge["qshp"], { status: -2, headers: -3 })
        adjustForMerge(inputVsOutputMerge["qsHP"], { status: -1 })
        adjustForMerge(inputVsOutputMerge["QShP"], { status: 2 })
        adjustForMerge(inputVsOutputMerge["qshP"], { status: -1, headers: -2 })
        for (var subTest in inputVsOutputMerge) {
           var input = buildInput(subTest, /*merge*/true)
           TestService_.Utils.assertEquals(inputVsOutputMerge[subTest], TableRangeUtils_.buildSpecialRowInfo(input), subTest + "[" + JSON.stringify(input) + "]")
        }
     })
  }
  ////////////////////////////////////////////////////////

  return {
    buildSpecialRowInfo_: buildSpecialRowInfo_
  }

}())
