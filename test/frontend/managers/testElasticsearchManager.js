var TestElasticsearchManager = (function() {

  var testSuiteRoot = "testElasticsearchManager"

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] test _source generation`, function(assert) {
    var filterFieldTests = {
      "-,+": { includes: [], excludes: [] },
      "+": { includes: [], excludes: [] },
      "#test": { includes: [], excludes: [] },
      "   ,   ": { includes: [], excludes: [] },
      "$$beats_fields": {
        includes: [ "host", "beat", "input", "prospector", "source", "offset", "@timestamp" ],
        excludes: [] },
      "-$$beats_fields": {
        excludes: [ "host", "beat", "input", "prospector", "source", "offset", "@timestamp" ],
        includes: [] },
      "$$docmeta_fields": {
        includes: [ "_id", "_index", "_score", "_type" ],
        excludes: [] },
      "-$$docmeta_fields": {
        excludes: [ "_id", "_index", "_score", "_type" ],
        includes: [] },
      "-t1, -t2, t3, -t4, t5": { includes: ["t3", "t5"], excludes: ["t1", "t2"] },
      "t1, -t2": { includes: ["t1"], excludes: [] },
      "-t1": { includes: [], excludes: ["t1"] },
      "/reg,ex/": { includes: [], excludes: [] },
      "-/reg,ex/": { includes: [], excludes: [] }
    }
    Object.keys(filterFieldTests).forEach(function(testInStr) {
      var expectedOut = filterFieldTests[testInStr]
      assert.deepEqual(
        ElasticsearchManager.TESTONLY.convertFieldFilterToSource_([ testInStr ]), expectedOut, `Regex test ${testInStr}`)
    })

  })

}())
