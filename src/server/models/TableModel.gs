/** The default table config - also using to sort-of-document the model */
var defaultTableConfig_ = {
  "enabled": true,
  "common": {
//     "refresh": {
//        "on_query_change": true,
//        "timed": false,
//        "refresh_s": 60
//     },
     "query": {
//       "index_pattern": "tbd",
       "source": "none",
        //, //points to field to use ("global", "local", "fixed") .. NOT_SUPPORTED: "global", "fixed"
//        "global": {
//           "range_name": "tbd"
//        },
        "local": {
           "position": "top" //(or "bottom" ... NOT_SUPPORTED: "bottom")
        }
        //,
//        "fixed": {
//           "string": "{} or SQL or lucene"
//        }
     },
     "pagination": {
        "source": "none",
        //, //points to field to use ("global", "local", "fixed") .. NOT_SUPPORTED: "global", "fixed"
//       "global": {
//          "enabled": false,
//          "range_name": "tbd"
//       },
       "local": {
          "position": "bottom" //(or "top") .. NOT_SUPPORTED: "top"
       }
     },
     "status": {
        "position": "top", //(or "bottom", "none")
        "merge": true //(if false will be its own separate line, else will merge with query/pagination if they exist)
     },
     "headers": {
        "position": "top", //(or "bottom", "top_bottom", "none") .. NOT_SUPPORTED: "bottom", "top_bottom"
        "field_filters": [
          "# eg -x.*.y / +x.**",
          "# [+-]/regex/",
          "#(note fields are laid out in selection order)"
        ], //(# to ignore an entry, [+-] to be +ve/-ve selection, // for regex else */** for single/multi path wildcard)
        "exclude_filtered_fields_from_autocomplete": true,
        "autocomplete_filters": [ //(only affects autocomplete - eg for aggregations)
          "# eg -x.*.y / +x.**",
          "# [+-]/regex/"
        ], //(# to ignore an entry, [+-] to be +ve/-ve selection, // for regex else */** for single/multi path wildcard)
        "field_aliases": [
          "#field.path=Alias To Use",
          "#(note fields are laid out in selection order within regex matches)"
        ] //(# to ignore, format is '<field-path>=Alias')
     },
     "formatting": {
        "theme": "minimal" //(or "none", in the future: "default", etc)
     },
     "skip": {
        "rows": "", //comma-separated list of offsets
        "cols": "", //comma-separated list of offsets
     }
     //,
//     "rotated": false, //(left-to-right instead of top-to-bottom)
//     "inverted": false //(right-to-left/bottom-to-top)
  },
  "data_table": {
    "enabled": false,
  },
   "aggregation_table": {
      "enabled": false,
      //"index_pattern": "string"
      "query": {
         "query": {
            "query_string": { "query": "$$query" }
         }
      },
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
              "--DESCRIBE $$index\n" +
              "--SELECT * FROM $$index WHERE $$query $$pagination"
  },
  "cat_table": {
    "enabled": false,
    "endpoint": "",
    "options": [ ] // (prefix with '#' to ignore)
  }
}
