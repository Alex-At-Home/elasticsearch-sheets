var AggregationInfo = { "bucket": {
  //Special one I built for convenenience
  "easy_composite": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-composite-aggregation.html",
    "default_filter__": "-after_key*",
    "info": "Nests the following 'children' elements (-1 for all) into a 'composite' aggregation. Use the 'extra_params' map to add composite fields like 'order' to the children. Child 'field_filter' are ignored.",
    "size": 100,
    "children": -1,
    "extra_params": {
      "CHILD_AGG": { "order": "dec" }
    }
  },
  //ES
  "adjacency_matrix": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-adjacency-matrix-aggregation.html",
    "filters" : {
      "FILTERNAME1": {
        "FILTERTYPE": {
        }
      },
      "FILTERNAME2": {
        "FILTERTYPE": {
        }
      }
    }
  },
  "auto_date_histogram": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-autodatehistogram-aggregation.html",
    "field": "DATEFIELDNAME",
    "buckets": 10
  },
  "children": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-children-aggregation.html",
    "type": "JOINTYPE"
  },
  "composite": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-composite-aggregation.html",
    "default_filter__": "-after_key*",
    "size": 100,
    "sources": [
      {
        "AGGNAME": {
          "AGGTYPE": {
            "order": "desc"
          }
        }
      }
    ]
  },
  "date_histogram": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-datehistogram-aggregation.html",
    "field": "DATEFIELDNAME",
    "interval": "INTERVAL"
  },
  "date_range": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-daterange-aggregation.html",
    "field": "DATEFIELDNAME",
    "format": "DATEFORMAT",
    "ranges": [
      {
        "key": "OPTIONAL_RANGENAME",
        "from": "FROMDATE",
        "to": "TODATE"
      }
    ]
  },
  //TODO...
  "histogram": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-histogram-aggregation.html",
    "field": "FIELDNAME",
    "interval": 1000
  },
  //TODO...
  "range": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-range-aggregation.html",
    "ranges": [
      {
        "key": "OPTIONAL_RANGENAME",
        "from": 0,
        "to": 100
      }
    ]
  },
  //TODO...
  "terms": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html",
    "default_filter__": "-doc_count_error_upper_bound,-sum_other_doc_count",
    "field": "FIELDNAME",
    "size": 100
  }
}, "metric": {
  "avg": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-avg-aggregation.html",
    "field": "FIELDNAME"
  },
  "weighted_avg": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-weight-avg-aggregation.html",
    "value": {
      "field": "FIELDNAME"
    },
    "weight": {
      "field": "FIELDNAME"
    }
  },
  "sum": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-sum-aggregation.html",
    "field": "FIELDNAME"
  },
  //TODO...
  "median_absolute_deviation": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-median-absolute-deviation-aggregation.html",
    "field": "FIELDNAME"
  }
}, "pipeline": {
  "avg_bucket": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-avg-bucket-aggregation.html",
    "buckets_path": "BUCKETPATH",
    "gap_policy": "skip"
  },
  //TODO...
  "bucket_selector": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-bucket-selector-aggregation.html",
    "buckets_path": {
      "PARAM1": "BUCKETPATH1",
      "PARAM2": "BUCKETPATH2"
    },
    "script": "params.PARAM1 > params.PARAM2"
  },
  "bucket_sort": {
    "url__": "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-bucket-sort-aggregation.html",
    "sort": [
      { "FIELDNAME": { "order": "desc" } }
    ],
    "from": 0,
    "size": 100
  }
  //TODO...
}
}
