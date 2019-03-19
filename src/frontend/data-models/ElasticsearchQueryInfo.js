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

  }
  // Span Queries
  // TODO: 2 more misc
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
]
//TODO add some date formats?
