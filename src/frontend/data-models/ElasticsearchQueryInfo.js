var QueryInfo = {
  // Misc queries
  "Misc Query": {
    "match_all": {},

  },
  // Full text Queries
  "Full Text Query": {
    "match": { "FIELD": { "query": "QUERY" } },
    "match_phrase": { "FIELD": { "query": "QUERY" } },
    "match_phrase_prefix": { "FIELD": { "query": "QUERY" } },
    "multi_match": { "query": "QUERY", "type": "best_fields", "fields": [ "FIELD1", "FIELD2" ] },
    "common": { "FIELD": { "query": "QUERY", "minimum_should_match": 1 } },
    "query_string": { "query": "QUERY" },
    "simple_query_string": { "query": "QUERY", "fields": [ "FIELD1", "FIELD2" ], "flags": "ALL" }
  },
  // Term level Queries
  "Term Level Query": {
    "term": { "FIELD": { "value": "VALUE" } },
    "terms": { "FIELD": [ "VALUE1", "VALUE2"] },
    "terms_set": { "FIELDA": { "terms": [ "VALUE1", "VALUE2" ], "minimum_should_match_field": "FIELDB" }},
    "range": { "FIELD": { "gt": 0, "lte": 1 } },
    "exists": { "field": "FIELD" },
    "prefix": { "FIELD": { "value": "PREFIX" } },
    "wildcard": { "FIELD": { "value": "WILDCARD_VALUE" } },
    "regexp": { "FIELD": { "value": "REGEXP_VALUE", "flags": "ALL" } },
    "fuzzy": { "FIELD": { "value": "FUZZY_VALUE" } },
    "type": { "value": "DOC_TYPE" },
    "ids": { "type": "DOC_TYPE", "values": [ "VALUE1", "VALUE2" ] }
  },
  // Compound Queries
  "Compound Query": {
    "constant_score": {},
    "bool": { "must": [], "filter": [], "must_not": [], "should": [] },
    "dis_max": { "queries": [ ] },
    "function_score": { "query": {}, "FUNCTION_SCORE": {}, "score_mode": "multiply", "boost_mode": "multiply" },
    "boosting": { "positive": {}, "negative": {}, "negative_boost": 0.0 }
  },
  // Joining Queries
  "Joining Query": {
    "nested": { "path": "NESTED_PATH", "score_mode": "avg", "query": {} },
    "has_child": { "type": "DOC_TYPE", "query": {}, "score_mode": "none" },
    "has_parent": { "parent_type": "DOC_TYPE", "query": {}, "score": false },
    "parent_id": { "type": "DOC_TYPE", "id": "ID" }
  },
  // Geo Queries
  "Geo Query": {
    "geo_shape": { "FIELDA": { "shape": { "type": "envelope", "FIELDB": [] }, "relation": "within" } },
    "geo_bounding_box": { "type": "memory", "FIELD": { "top_left": {"lat": 1, "lon": 2}, "bottom_right": [11, 12] } },
    "geo_distance": { "distance": "0km", "FIELD": { "lat": 1, "lon": 2 }, "distance_type": "arc" },
    "geo_polygon": { "FIELD": {"points": [{ "lat": 1, "lon": 2 }] }}
  },
  // Specialized Queries
  "Specialized Query": {
    "more_like_this": { "fields": [ "FIELD1", "FIELD2" ], "like": "TEXT", "min_term_freq": 2, "max_query_terms": 25 },
    "script": { "source": "SCRIPT", "lang": "painless", "params": {} },
    "percolate": { "field": "QUERY_FIELD", "documents": [{}] },
    "wrapper": { "query": "BASE64_ENCODED_QUERY" }
  },
  // Span Queries
  "Span Query": {
    "span_term": { "FIELD": { "value": "VALUE" } },
    "span_multi": { "match": { } },
    "span_first": { "match": { } },
    "span_near": { "clauses": [ { "span_term": { "FIELD": "VALUE" } } ], "in_order": false, "slop": 10 },
    "span_or": { "clauses": [ { "span_term": { "FIELD": "VALUE" } } ] },
    "span_not": { "include": { "span_term": { "FIELD1": "VALUE1" } }, "exclude": { "span_term": { "FIELD2": "VALUE2" } } },
    "span_containing": { "little": { "span_term": { "FIELD1": "VALUE1" } }, "big": { "span_term": { "FIELD2": "VALUE2" } } },
    "span_within": { "little": { "span_term": { "FIELD1": "VALUE1" } }, "big": { "span_term": { "FIELD2": "VALUE2" } } },
    "field_masking_span": { "query": {}, "field": "FIELD" }
  },
  // Top-level fields
  "Top Level Query Parameter": {
    "sort": [ { "FIELD": {"order": "asc" } } ],
    "_source": {   "includes": [ "FIELD_GLOB" ], "excludes": [ "" ] },
    "stored_fields": [ "FIELD1", "FIELD2" ],
    "script_field": { "FIELDNAME": { "script": { "lang": "painless", "source": "SCRIPT", "params": {} }}},
    "docvalue_fields" : [ { "field": "FIELD", "format": "use_field_mapping" } ],
    "post_filter": {},
    "highlight": {"fields": { "FIELD": {} }},
    "rescore": {"window_size": 10, "query": {}},
    "collapse": { "field": "FIELD" }
  }
}
var QueryKeywords = [
  "query", "operator", "zero_terms_query", "cutoff_frequency",
  "auto_generate_synonyms_phrase_query", "analyzer",
  "max_expansions",
  "type", "tie_breaker",
  "best_fields", "most_fields", "cross_fields", "phrase", "phrase_prefix",
  "minimum_should_match", "low_freq", "high_freq",
  "default_field",
  "quote_analyzer", "allow_leading_wildcard", "enable_position_increments",
  "fuzzy_max_expansions", "fuzziness", "fuzzy_prefix_length",
  "fuzzy_transpositions", "phrase_slop", "boost", "auto_generate_phrase_queries",
  "analyze_wildcard", "max_determinized_states", "minimum_should_match",
  "lenient", "time_zone", "quote_field_suffix", "auto_generate_synonyms_phrase_query",
  "all_fields",
  "flags", "quote_field_suffix",
  "value",
  "terms",
  "gt", "gte", "lt", "lte", "format", "time_zone",
  "prefix_length", "transpositions",
  "type",
  "must", "filter", "must_not", "should", "_name",
  "script_score", "weight", "random_score", "field_value_factor", "gauss", "linear", "exp",
  "script", "source", "params", "weight", "seed", "field", "factor", "modifier", "missing",
  "none", "log", "log1p", "lop2p", "ln", "ln1p", "ln2p", "square", "sqrt", "reciprocal",
  "origin", "scale", "offset", "decay",
  "score_mode", "multiply", "sum", "avg", "min", "max", "first", "replace",
  "positive", "negative", "negative_boost",
  "ignore_unmapped", "min_children", "max_children",
  "parent_type",
  "shape", "envelope", "relation",
  "within", "disjoint", "intersects", "contains",
  "indexed_shape", "id",
  "top_left", "bottom_right", "lat", "lon", "indexed", "validation_method",
  "IGNORE_MALFORMED", "COERCE", "STRICT", "BBOX (1, 2, 11, 12)", "top", "left", "bottom", "right",
  "validation_method", "plane", "mi", "miles", "yd", "yards", "ft", "feet",
  "in", "inch", "km", "kilometers", "m", "meter", "cm", "centimeters", "mm", "millimeters",
  "NM", "nauticalmiles", "nmi",
  "fields", "like", "min_term_freq", "max_query_terms", "unlike", "like_text", "ids", "docs",
  "min_doc_freq", "max_doc_freq", "min_word_length", "max_word_length", "stop_words",
  "fail_on_unsupported_field", "boost_terms", "include",
  "document", "documents", "name", "document_type", "index", "routing", "preference",
  "version",
  "end", "slop", "in_order", "clauses", "exclude", "pre", "post", "dist",
  "little", "big",
  "rewrite", "constant_score", "scoring_boolean", "constant_score_boolean",
  "top_terms_N", "top_terms_boost_N", "top_terms_blended_freqs_N",
  "inner_hits"
]
var TopLevelQueryParameters = [
  "timeout", "from", "size",
  "request_cache", "allow_partial_search_results", "terminate_after",
  "batched_reduce_size",
  "aggs",
  "search_type",
  "explain",
  "version",
  "indices_boost",
  "min_score",
  "search_after"
]
var TopLevelQueryParameterValues = [
  "search_type", "dfs_query_then_fetch", "query_then_fetch",
  "order", "asc", "desc", "mode", "min", "max", "avg", "median", "sum",
  "nested", "path", "filter", "max_children",
  "includes", "excludes",
  "_none_",
  "lang", "source", "script", "params",
  "field", "format", "use_field_mapping",
]
