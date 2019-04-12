var TestElasticsearchUtils = (function() {

  var testSuiteRoot = "testElasticsearchUtils"

  QUnit.test(`[${testSuiteRoot}] test mapping parser`, function(assert) {

    var testMapping =
    {
      "mapping_test_index": {
        "mappings": {
          "properties": {
            "field1": {
              "type": "text"
            }
          }
        }
      },
      "more_complex_with_types": {
        "mappings" : {
          "doc" : {
            "properties" : {
              "@timestamp" : {
                "type" : "date"
              },
              "beat" : {
                "properties" : {
                  "hostname" : {
                    "type" : "text",
                    "fields" : {
                      "keyword" : {
                        "type" : "keyword",
                        "ignore_above" : 256
                      }
                    }
                  }
                }
              },

              "games" : {
                "properties" : {
                  "date" : {
                    "type" : "date"
                  },
                  "location_type" : {
                    "type" : "text",
                    "fields" : {
                      "keyword" : {
                        "type" : "keyword",
                        "ignore_above" : 256
                      }
                    }
                  },
                  "opp_rank" : {
                    "type" : "long"
                  },
                  "opponent" : {
                    "properties" : {
                      "team" : {
                        "type" : "text",
                        "fields" : {
                          "keyword" : {
                            "type" : "keyword",
                            "ignore_above" : 256
                          }
                        }
                      },
                      "year" : {
                        "type" : "long"
                      }
                    }
                  }
                }
              }

            }
          }
        }
      }
    }

    var expectedResults = [
      { name: "field1", type: "text" },
      { name: "@timestamp", type: "date" },
      { name: "beat.hostname", type: "text" },
      { name: "beat.hostname.keyword", type: "keyword" },
      { name: "games.date", type: "date" },
      { name: "games.location_type", type: "text" },
      { name: "games.location_type.keyword", type: "keyword" },
      { name: "games.opp_rank", type: "long" },
      { name: "games.opponent.team", type: "text" },
      { name: "games.opponent.team.keyword", type: "keyword" },
      { name: "games.opponent.year", type: "long" },
    ]

    assert.deepEqual(
      ElasticsearchUtil.getMappingList(testMapping),
      expectedResults, `mapping test`
    )
  })
}())
