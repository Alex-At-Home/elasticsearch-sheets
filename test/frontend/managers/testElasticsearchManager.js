var TestElasticsearchManager = (function() {

  var testSuiteRoot = "testElasticsearchManager"

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

  QUnit.test(`[${testSuiteRoot}] test trigger check`, function(assert) {
    var options = [
      "disabled", "manual", "config_change", "control_change", "content_change"
    ]
    var expected = [
      [ 1, 0, 0, 0, 0],
      [ 1, 1, 0, 0, 0],
      [ 1, 1, 1, 0, 0],
      [ 1, 1, 1, 1, 0],
      [ 1, 1, 1, 1, 1],
    ]
    var actual = []
    options.forEach(function(ii) {
      var actualRow = []
      options.forEach(function(jj) {
        var config = { trigger: ii }
        actualRow.push(ElasticsearchManager.TESTONLY.isTriggerEnabled_(config, jj) ? 1 : 0)
      })
      actual.push(actualRow)
    })
    assert.deepEqual(actual, expected, "Trigger matrix")
  })

  QUnit.test(`[${testSuiteRoot}] test ES readiness check`, function(assert) {
    var esMeta1 = {} //(missing URL)
    var ready1 = true
    ElasticsearchManager.getEsReadiness(esMeta1,
      function(esMeta) { //ready
      },
      function(esMeta) { //not ready
        assert.deepEqual(esMeta, { enabled: true }, "Empty ES counts as enabled")
        ready1 = false
      }
    )
    assert.equal(ready1, false, "ES ready 1, no URL")

    var esMeta2 = { enabled: true, auth_type: "password", password: "test" } //(missing URL)
    var ready2 = true
    ElasticsearchManager.getEsReadiness(esMeta2,
      function(esMeta) { //ready
      },
      function(esMeta) { //not ready
        assert.deepEqual(esMeta, esMeta2, "ES meta object passed in to failure")
        ready2 = false
      }
    )
    assert.equal(ready2, false, "ES ready 2, no URL")

    var esMeta3 = { enabled: true, auth_type: "password", password: "test", url: "test" }
    var ready3 = false
    ElasticsearchManager.getEsReadiness(esMeta3,
      function(esMeta) { //ready
        assert.deepEqual(esMeta, esMeta3, "ES meta object passed in to success")
        ready3 = true
      },
      function(esMeta) { //not ready
      }
    )
    assert.equal(ready3, true, "ES ready 3")

    var esMeta4 = { auth_type: "password", url: "test" }
    var ready4 = true
    ElasticsearchManager.getEsReadiness(esMeta4,
      function(esMeta) { //ready
      },
      function(esMeta) { //not ready
        ready4 = false
      }
    )
    assert.equal(ready4, true, "ES ready 4")

    var esMeta5 = { enabled: false, auth_type: "password", password: "test", url: "test" }
    var ready5 = true
    ElasticsearchManager.getEsReadiness(esMeta5,
      function(esMeta) { //ready
      },
      function(esMeta) { //not ready
        assert.deepEqual(esMeta, esMeta5, "ES meta object passed in to failure")
        ready5 = false
      }
    )
    assert.equal(ready5, false, "ES ready 5, disabled")

  })

}())
