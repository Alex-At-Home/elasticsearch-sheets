/** The default table config - also using to sort-of-document the model */
var defaultTableConfig_ = {
  "trigger": "control_change", //OR "disabled", "manual", "config_change", control_change", "content_change" (timed will be separate param)
  "common": {
//     "refresh": {
//        "on_query_change": true,
//        "timed": false,
//        "refresh_s": 60
//     },
     "global_content_triggers": [], //array of ranges ("sheet!range") to include when deciding whether to mark the table as edited
     "global_control_triggers": [], //array of ranges ("sheet!range") to include when deciding whether to refresh the table
     "query": {
//       "index_pattern": "tbd",
       "source": "none",
//,       //^points to field to use ("global", "local")
       "global": {
          "range_name": "[sheet!]range"
       },
        "local": {
           "position": "top" //(or "bottom")
        }
     },
     "pagination": {
        "source": "none",
        //, //points to field to use ("global", "local") .. NOT_SUPPORTED: "global"
//       "global": {
//          "enabled": false,
//          "range_name": "tbd"
//       },
       "local": {
          "position": "bottom" //(or "top")
       }
     },
     "status": {
        "position": "top", //(or "bottom", "none", "global")
        "merge": false, //(if false will be its own separate line, else will merge with query/pagination if they exist)
        "global": {
           "range_name": "[sheet!]range"
        }
     },
     "headers": {
        "position": "top", //(or "bottom", "top_bottom", "none") .. NOT_SUPPORTED: "bottom", "top_bottom"
        "field_filters": [
          "# eg -x.*.y / +x.y (start with -s where possible)",
          "# pre-built groups: $$<name>",
          "#(note fields are laid out in match order)"
        ], //(# to ignore an entry, [+-] to be +ve/-ve selection, // for regex else * for full wildcard)
        "exclude_filtered_fields_from_autocomplete": true,
        "autocomplete_filters": [ //(only affects autocomplete - eg for aggregations)
          "# eg x, -x.*.y, +x.y (start with -s if possible)",
          "# pre-built groups: $$<name>"
        ], //(# to ignore an entry, [+-] to be +ve/-ve selection, // for regex else * for full wildcard)
        "field_aliases": [
          "#field.path=Alias To Use",
          "#(note fields are laid out in order within filter matches)"
        ] //(# to ignore, format is '<field-path>=Alias')
     },
     "formatting": {
        "include_note": true, //(adds a note to the top left of each table with the name)
        "theme": "minimal" //(or "none", in the future: "default", etc)
     },
     "skip": { //NOT_SUPPORTED
//        "rows": "", //comma-separated list of offsets
//        "cols": "", //comma-separated list of offsets
     }
     //,
//     "rotated": false, //(left-to-right instead of top-to-bottom)
//     "inverted": false //(right-to-left/bottom-to-top)
  },
  "data_table": {
    "enabled": false,
    //"index_pattern": "string"
    "query": {
      "query": {
        "bool": {
          "must": [{
            "query_string": {
              "query": "$$query"
            }
          }],
          "filter": [],
          "must_not": [],
          "should": []
        }
      },
      "from": "$$pagination_from",
      "size": "$$pagination_size",
      "_source": "$$field_filters"
    },
    "script_fields": []
    // format is {
    //  name: "string", // the name used in the output column
    //  source: "string", // the script itself
    //  params: {...} // the params passed into the script
    // }
  },
   "aggregation_table": {
      "enabled": false,
      //"index_pattern": "string"
      "query": {
        "query": {
          "bool": {
            "must": [{
              "query_string": {
                "query": "$$query"
              }
            }],
            "filter": [],
            "must_not": [],
            "should": []
          }
        },
        "_source": "$$field_filters"
      },
      "script_fields": [], // see data_table.script_fields
      "buckets": [],
        // format is {
        //  name: "string", // the name used in the output column
        //  agg_type: "string", // The ES aggregation type
        //  config: { ... }, // the config obj corresponding to the agg_type
        //  location: "string",
        //  field_filter: "string"  // combined with the top-level field_filter
        //                          // (except -* removes it from the output builder
        //                          // which circumvents the restrictions on hierarchy
        // }
      "metrics": [], //(same format)
      "pipelines": [], //(same format)
      "map_reduce": {
         "params": {},
         "init": "//Init \"state\" variable, eg:\n//(list or map)\n//state.collect = [];\n//state.collect = [:];",
         "map": "//Update state with info\n//from \"doc\" or \"params._source\"\n//(called once per doc)\n//eg state.collect.add(\n//    doc['field'].value\n// );\n// or (fold)\n// state.collect.stat += \n//    doc['field'].value;",
         "combine": "//Called once per shard\n//once all docs processed\n//eg:\n//return state.collect\n//   .stream()\n//   .filter(t => true)\n//   .collect(shardCollector);",
         "reduce": "//Called once on \"states\",\n//a list of the return\n//values from each shard's\n//combine:\n//return states.stream()\n//   .collect(finalCollector);",
         "lib": "//Add internal logic here\n//to keep the map/etc scripts\n//easier to follow.\n//Everything in here is \n//available to all other\n//scripts. Eg:\n//def myFunction(def param) {\n// return value   \n//}"
      }
   },
  "sql_table": {
    "enabled": false,
    //"index_pattern": "string"
    "query": "--SHOW TABLES\n" +
              "--DESCRIBE \"$$index\"\n" +
              "--SELECT * FROM \"$$index\" WHERE $$query $$pagination"
  },
  "cat_table": {
    "enabled": false,
    "endpoint": "",
    "options": [ ] // (prefix with '#' to ignore)
  }
}
