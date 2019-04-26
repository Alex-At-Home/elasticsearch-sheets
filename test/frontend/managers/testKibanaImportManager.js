var TestElasticsearchManager = (function() {

  var testSuiteRoot = "testKibanaImportManager"

  QUnit.test(`[${testSuiteRoot}] test URL JSON parsing`, function(assert) {
    QUnit.dump.maxDepth = 100

    // Create new table:

    var testUrlJsonStr1 = "(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-2y,mode:quick,to:now))"

    var testUrlJsonStr2 = "(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,field:team_date,index:da9abba0-1a6a-11e9-a62d-fb6ad2baead0,key:team_date,negate:!f,params:(value:'Wisconsin%202019114'),type:phrase,value:'Wisconsin%202019114'),script:(script:(inline:'boolean%20compare(Supplier%20s,%20def%20v)%20%7Breturn%20s.get()%20%3D%3D%20v;%7Dcompare(()%20-%3E%20%7B%20doc%5B!'opponent.team.keyword!'%5D.value%20%2B%20%22%20%22%20%2B%20doc%5B!'date!'%5D.value.year%20%2B%20doc%5B!'date!'%5D.value.monthOfYear%20%2B%20doc%5B!'date!'%5D.value.dayOfMonth%20%7D,%20params.value);!!',lang:painless,params:(value:'Wisconsin%202019114'))))),linked:!f,query:(language:lucene,query:'opponent:*'),uiState:(),vis:(aggs:!((id:'2',schema:metric,type:count),(params:(field:_id,orderBy:'2',size:20),schema:segment,type:terms)),type:histogram))"

    var expectedJson1 = { json: {
        "filters": [],
        "refreshInterval": {
          "pause": true,
          "value": 0
        },
        "time": {
          "from": "now-2y",
          "mode": "quick",
          "to": "now"
        }
      }
    }
    var expectedJson2 = { json: {
        "filters": [
          {
            "$state": {
              "store": "appState"
            },
            "meta": {
              "alias": null,
              "disabled": false,
              "field": "team_date",
              "index": "da9abba0-1a6a-11e9-a62d-fb6ad2baead0",
              "key": "team_date",
              "negate": false,
              "params": {
                "value": "Wisconsin 2019114"
              },
              "type": "phrase",
              "value": "Wisconsin 2019114"
            },
            "script": {
              "script": {
                "inline": "boolean compare(Supplier s, def v) {return s.get() == v;}compare(() -> { doc['opponent.team.keyword'].value + \" \" + doc['date'].value.year + doc['date'].value.monthOfYear + doc['date'].value.dayOfMonth }, params.value);!",
                "lang": "painless",
                "params": {
                  "value": "Wisconsin 2019114"
                }
              }
            }
          }
        ],
        "linked": false,
        "query": {
          "language": "lucene",
          "query": "opponent:*"
        },
        "uiState": {},
        "vis": {
          "aggs": [
            {
              "id": "2",
              "schema": "metric",
              "type": "count"
            },
            {
              "params": {
                "field": "_id",
                "orderBy": "2",
                "size": 20
              },
              "schema": "segment",
              "type": "terms"
            }
          ],
          "type": "histogram"
        }
      }
    }

    assert.deepEqual(
      KibanaImportManager.TESTONLY.urlObjToJson_(testUrlJsonStr1), expectedJson1, "Sample simple JSON URL, _g="
    )
    assert.deepEqual(
      KibanaImportManager.TESTONLY.urlObjToJson_(testUrlJsonStr2), expectedJson2, "Sample simple JSON URL, _a="
    )

    // Update existing table:

    var testUrlJsonStr3 = "(filters:!(),linked:!f,query:(language:lucene,query:''),uiState:(vis:(params:(sort:(columnIndex:3,direction:desc)))),vis:(aggs:!((enabled:!t,id:'1',params:(customLabel:Appearances),schema:metric,type:count),(enabled:!t,id:'9',params:(customLabel:Games,field:team_date),schema:metric,type:cardinality),(enabled:!t,id:'5',params:(customLabel:'Total%20minutes',field:duration_mins),schema:metric,type:sum),(enabled:!t,id:'10',params:(customBucket:(enabled:!t,id:'10-bucket',params:(customInterval:'2h',drop_partials:!f,extended_bounds:(),field:date,interval:d,min_doc_count:1,timeRange:(from:now-2y,mode:quick,to:now),time_zone:America%2FNew_York,useNormalizedEsInterval:!t),schema:bucketAgg,type:date_histogram),customLabel:min%2Fg,customMetric:(enabled:!t,id:'10-metric',params:(customLabel:'',field:duration_mins,json:''),schema:metricAgg,type:sum)),schema:metric,type:avg_bucket),(enabled:!t,id:'3',params:(customLabel:'Total%20%2B-',field:team_stats.plus_minus),schema:metric,type:sum),(enabled:!t,id:'8',params:(customBucket:(enabled:!t,id:'8-bucket',params:(customInterval:'2h',drop_partials:!f,extended_bounds:(),field:date,interval:d,json:'',min_doc_count:1,timeRange:(from:now-2y,mode:quick,to:now),time_zone:America%2FNew_York,useNormalizedEsInterval:!t),schema:bucketAgg,type:date_histogram),customLabel:%2B-%2Fg,customMetric:(enabled:!t,id:'8-metric',params:(customLabel:'',field:team_stats.plus_minus,json:''),schema:metricAgg,type:sum),json:'%7B%20%22format%22:%20%220,0.%5B0%5D%22%20%7D'),schema:metric,type:avg_bucket),(enabled:!t,id:'6',params:(customLabel:'Total%20%2B',field:team_stats.pts),schema:metric,type:sum),(enabled:!t,id:'7',params:(customLabel:'Total%20-',field:opponent_stats.pts),schema:metric,type:sum),(enabled:!t,id:'2',params:(customLabel:Lineups,field:lineup_id,missingBucket:!f,missingBucketLabel:Missing,order:desc,orderBy:'3',otherBucket:!f,otherBucketLabel:Other,size:100),schema:bucket,type:terms),(enabled:!t,id:'11',params:(customBucket:(enabled:!t,id:'11-bucket',params:(customInterval:'2h',drop_partials:!f,extended_bounds:(),field:date,interval:d,min_doc_count:1,timeRange:(from:now-2y,mode:quick,to:now),time_zone:America%2FNew_York,useNormalizedEsInterval:!t),schema:bucketAgg,type:date_histogram),customLabel:%2B%2Fg,customMetric:(enabled:!t,id:'11-metric',params:(field:team_stats.pts),schema:metricAgg,type:sum)),schema:metric,type:avg_bucket),(enabled:!t,id:'12',params:(customBucket:(enabled:!t,id:'12-bucket',params:(customInterval:'2h',drop_partials:!f,extended_bounds:(),field:date,interval:d,min_doc_count:1,timeRange:(from:now-2y,mode:quick,to:now),time_zone:America%2FNew_York,useNormalizedEsInterval:!t),schema:bucketAgg,type:date_histogram),customLabel:'-%2Fg',customMetric:(enabled:!t,id:'12-metric',params:(customLabel:'',field:opponent_stats.pts),schema:metricAgg,type:sum)),schema:metric,type:avg_bucket)),params:(perPage:100,showMetricsAtAllLevels:!f,showPartialRows:!f,showTotal:!t,sort:(columnIndex:3,direction:desc),totalFunc:sum),title:'Plus%20Minus%20Table',type:table))"

    expectedJson3 = {
      "json": {
        "filters": [],
        "linked": false,
        "query": {
          "language": "lucene",
          "query": ""
        },
        "uiState": {
          "vis": {
            "params": {
              "sort": {
                "columnIndex": 3,
                "direction": "desc"
              }
            }
          }
        },
        "vis": {
          "aggs": [
            {
              "enabled": true,
              "id": "1",
              "params": {
                "customLabel": "Appearances"
              },
              "schema": "metric",
              "type": "count"
            },
            {
              "enabled": true,
              "id": "9",
              "params": {
                "customLabel": "Games",
                "field": "team_date"
              },
              "schema": "metric",
              "type": "cardinality"
            },
            {
              "enabled": true,
              "id": "5",
              "params": {
                "customLabel": "Total minutes",
                "field": "duration_mins"
              },
              "schema": "metric",
              "type": "sum"
            },
            {
              "enabled": true,
              "id": "10",
              "params": {
                "customBucket": {
                  "enabled": true,
                  "id": "10-bucket",
                  "params": {
                    "customInterval": "2h",
                    "drop_partials": false,
                    "extended_bounds": {},
                    "field": "date",
                    "interval": "d",
                    "min_doc_count": 1,
                    "timeRange": {
                      "from": "now-2y",
                      "mode": "quick",
                      "to": "now"
                    },
                    "time_zone": "America/New_York",
                    "useNormalizedEsInterval": true
                  },
                  "schema": "bucketAgg",
                  "type": "date_histogram"
                },
                "customLabel": "min/g",
                "customMetric": {
                  "enabled": true,
                  "id": "10-metric",
                  "params": {
                    "customLabel": "",
                    "field": "duration_mins",
                    "json": ""
                  },
                  "schema": "metricAgg",
                  "type": "sum"
                }
              },
              "schema": "metric",
              "type": "avg_bucket"
            },
            {
              "enabled": true,
              "id": "3",
              "params": {
                "customLabel": "Total +-",
                "field": "team_stats.plus_minus"
              },
              "schema": "metric",
              "type": "sum"
            },
            {
              "enabled": true,
              "id": "8",
              "params": {
                "customBucket": {
                  "enabled": true,
                  "id": "8-bucket",
                  "params": {
                    "customInterval": "2h",
                    "drop_partials": false,
                    "extended_bounds": {},
                    "field": "date",
                    "interval": "d",
                    "json": "",
                    "min_doc_count": 1,
                    "timeRange": {
                      "from": "now-2y",
                      "mode": "quick",
                      "to": "now"
                    },
                    "time_zone": "America/New_York",
                    "useNormalizedEsInterval": true
                  },
                  "schema": "bucketAgg",
                  "type": "date_histogram"
                },
                "customLabel": "+-/g",
                "customMetric": {
                  "enabled": true,
                  "id": "8-metric",
                  "params": {
                    "customLabel": "",
                    "field": "team_stats.plus_minus",
                    "json": ""
                  },
                  "schema": "metricAgg",
                  "type": "sum"
                },
                "json": "{ \"format\": \"0,0.[0]\" }"
              },
              "schema": "metric",
              "type": "avg_bucket"
            },
            {
              "enabled": true,
              "id": "6",
              "params": {
                "customLabel": "Total +",
                "field": "team_stats.pts"
              },
              "schema": "metric",
              "type": "sum"
            },
            {
              "enabled": true,
              "id": "7",
              "params": {
                "customLabel": "Total -",
                "field": "opponent_stats.pts"
              },
              "schema": "metric",
              "type": "sum"
            },
            {
              "enabled": true,
              "id": "2",
              "params": {
                "customLabel": "Lineups",
                "field": "lineup_id",
                "missingBucket": false,
                "missingBucketLabel": "Missing",
                "order": "desc",
                "orderBy": "3",
                "otherBucket": false,
                "otherBucketLabel": "Other",
                "size": 100
              },
              "schema": "bucket",
              "type": "terms"
            },
            {
              "enabled": true,
              "id": "11",
              "params": {
                "customBucket": {
                  "enabled": true,
                  "id": "11-bucket",
                  "params": {
                    "customInterval": "2h",
                    "drop_partials": false,
                    "extended_bounds": {},
                    "field": "date",
                    "interval": "d",
                    "min_doc_count": 1,
                    "timeRange": {
                      "from": "now-2y",
                      "mode": "quick",
                      "to": "now"
                    },
                    "time_zone": "America/New_York",
                    "useNormalizedEsInterval": true
                  },
                  "schema": "bucketAgg",
                  "type": "date_histogram"
                },
                "customLabel": "+/g",
                "customMetric": {
                  "enabled": true,
                  "id": "11-metric",
                  "params": {
                    "field": "team_stats.pts"
                  },
                  "schema": "metricAgg",
                  "type": "sum"
                }
              },
              "schema": "metric",
              "type": "avg_bucket"
            },
            {
              "enabled": true,
              "id": "12",
              "params": {
                "customBucket": {
                  "enabled": true,
                  "id": "12-bucket",
                  "params": {
                    "customInterval": "2h",
                    "drop_partials": false,
                    "extended_bounds": {},
                    "field": "date",
                    "interval": "d",
                    "min_doc_count": 1,
                    "timeRange": {
                      "from": "now-2y",
                      "mode": "quick",
                      "to": "now"
                    },
                    "time_zone": "America/New_York",
                    "useNormalizedEsInterval": true
                  },
                  "schema": "bucketAgg",
                  "type": "date_histogram"
                },
                "customLabel": "-/g",
                "customMetric": {
                  "enabled": true,
                  "id": "12-metric",
                  "params": {
                    "customLabel": "",
                    "field": "opponent_stats.pts"
                  },
                  "schema": "metricAgg",
                  "type": "sum"
                }
              },
              "schema": "metric",
              "type": "avg_bucket"
            }
          ],
          "params": {
            "perPage": 100,
            "showMetricsAtAllLevels": false,
            "showPartialRows": false,
            "showTotal": true,
            "sort": {
              "columnIndex": 3,
              "direction": "desc"
            },
            "totalFunc": "sum"
          },
          "title": "Plus Minus Table",
          "type": "table"
        }
      }      
    }

    assert.deepEqual(
      KibanaImportManager.TESTONLY.urlObjToJson_(testUrlJsonStr3), expectedJson3, "Sample complex JSON URL, _a="
    )

  })
}())
