/*
 * Sort-of-Unit/Sort-of-Integration tests for ElasticsearchResponseUtils.gs
 */

 function testElasticsearchRequestUtilsRunner() {
    TestService_.testRunner("ElasticsearchRequestUtils_", /*deleteTestSheets*/true)
 }
var TestElasticsearchRequestUtils_ = (function() {

  /** (PUBLIC) ElasticsearchRequestUtils_.buildAggregationQuery */
  function buildAggregationQuery_(testSheet, testResults) {

    var baseConfig = {
       "aggregation_table": {
         "map_reduce": {
            "params": {
               "k1": "v1"
            },
            "lib": "l",
            "init": "i",
            "map": "m",
            "combine": "c",
            "reduce": "r"
         },
         "query": {
            "query": { "testqk": "testqv:$$query" }
         },
         "buckets": [
           { }, //(skip, no name)

           { "name": "n1", "agg_type": "t1", "config": { "ck1": "cv1" }, "location": "automatic" },
           { "name": "n2", "agg_type": "t2", "location": "n3" },
           { "name": "n3", "agg_type": "t3", "config": { "ck3": "cv3" } },
           { "name": "in1", "agg_type": "it1", "config": { "ik1": "iv1" }, "field_filter": "-" }, //(won't be used in automatic location)
         ],
         "metrics": [
           { "name": "in2", "agg_type": "it2", "config": { "ik2": "iv2" }, "location": "in1" },

           { "name": "n4", "agg_type": "t4", "config": { "ck4": "cv4" }, "location": "automatic" },
           { "name": "n5", "agg_type": "__map_reduce__", "config": { "ck5": "cv5" }, "location": "n2" },

           { "name": "testname", "agg_type": "testtype", "location": "disabled" } //(skip, disabled)
         ],
         "pipelines": [
           { "name": "n6", "agg_type": "__map_reduce__", "config": { "ck6": "cv6" } },

           { "name": "testname", "agg_type": "testtype", "location": "disabled" }, //(skip, disabled)

           { "name": "n7", "agg_type": "t7", "config": { "ck7": "cv7" }, "location": "n1" }
         ]
       }
    }

    TestService_.Utils.performTest(testResults, "no duplicates", function() {
      try {
        badConfig = {
           "aggregation_table": {
             "buckets": [
               { "name": "dup1", config: {} }
             ],
             "metrics": [
               { "name": "dup1", config: {} }
             ]
           }
         }
         ElasticsearchRequestUtils_.buildAggregationQuery(badConfig, "")
         TestService_.Utils.assertEquals(true, false, "buildAggregationQuery(badConfig) should throw")
      } catch(err) {}
    })

    TestService_.Utils.performTest(testResults, "no reserved bucket names", function() {
      try {
        badConfig = {
           "aggregation_table": {
             "buckets": [
               { "name": "buckets", config: {} }
             ],
             "metrics": [
               { "name": "dup1", config: {} }
             ]
           }
         }
         ElasticsearchRequestUtils_.buildAggregationQuery(badConfig, "")
         TestService_.Utils.assertEquals(true, false, "buildAggregationQuery(badConfig) should throw")
      } catch(err) {}
    })

    TestService_.Utils.performTest(testResults, "normal_usage", function() {
       var postBody = ElasticsearchRequestUtils_.buildAggregationQuery(baseConfig, "\"*\"")

       var expectedBody = {
         "aggregations": {
            "n1": {
               "aggregations": {
                  "n3": {
                     "aggregations": {
                       "in1": {
                         "aggregations": {
                           "in2": {
                              "it2": {
                                 "ik2": "iv2"
                              }
                           },
                         },
                         "it1": {
                           "ik1": "iv1"
                         }
                       },
                        "n2": {
                           "aggregations": {
                              "n5": {
                                 "scripted_metric": {
                                    "combine_script": "l\n\nc",
                                    "init_script": "l\n\ni",
                                    "map_script": "l\n\nm",
                                    "params": {
                                       "_name_": "n5",
                                       "ck5": "cv5",
                                       "k1": "v1"
                                    },
                                    "reduce_script": "l\n\nr"
                                 }
                              }
                           },
                           "t2": {}
                        },
                        "n4": {
                           "t4": {
                              "ck4": "cv4"
                           }
                        },
                        "n6": {
                           "scripted_metric": {
                              "combine_script": "l\n\nc",
                              "init_script": "l\n\ni",
                              "map_script": "l\n\nm",
                              "params": {
                                 "_name_": "n6",
                                 "ck6": "cv6",
                                 "k1": "v1"
                              },
                              "reduce_script": "l\n\nr"
                           }
                        }
                     },
                     "t3": {
                        "ck3": "cv3"
                     }
                  },
                  "n7": {
                     "t7": {
                        "ck7": "cv7"
                     }
                  }
               },
               "t1": {
                  "ck1": "cv1"
               }
            }
         },
         "query": {
            "testqk": "testqv:\"*\""
         },
         "size": 0
      }
      TestService_.Utils.assertEquals(expectedBody, postBody)
    })
  }

  ////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////

  return {
    buildAggregationQuery_: buildAggregationQuery_
  }

}())
