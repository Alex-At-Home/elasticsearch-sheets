var DataExplorerTemplate =
{
   "aggregation_table": {
      "metrics": [
         {
            "agg_type": "__map_reduce__",
            "name": "data_explorer"
         }
      ],
      "map_reduce": {
         "reduce": "// For now just look at the first shard:\n//TODO: add sort\ndef first = states.iterator().next(); //TODO: actually want to merge\nfirst.collect.entrySet().forEach(kv -> {\n   def val = kv.getValue();\n   val.put(\"present_pct\", 100.0*val.get(\"doc_count\")/first.doc_count);\n   val.put(\"vals_per_doc\", val.get(\"count\")/val.get(\"doc_count\"));\n   val.put(\"avg\", val.get(\"sum\")/val.get(\"count\"));\n   val.put(\"string_samples\", String.join(\";\", val.get(\"samples\")));\n   \n   //TODO: calc type summaries\n   val.put(\"types\", String.join(\";\", val.get(\"type_freqs\").keySet()));\n   \n   if (null == val.get(\"min\")) {\n      val.remove(\"avg\");\n      val.remove(\"min\");\n      val.remove(\"max\");\n   }\n   val.remove(\"type_freqs\");\n   val.remove(\"samples\");\n   val.remove(\"sum\");\n   \n   val.remove(\"last_id\");\n   val.put(\"field_path\", kv.getKey());\n});\nreturn first.collect.values();\n",
         "init": "// README:\nstate.collect = new TreeMap();\nstate.index = 0;\nstate.doc_count = 0;",
         "lib": "//Add internal logic here\n//to keep the map/etc scripts\n//easier to follow.\n//Everything in here is \n//available to all other\n//scripts. Eg:\n//def myFunction(def param) {\n// return value   \n//}",
         "params": {
            "max_string_samples": 10,
            "sub_sample_ratio": -1,
            "max_doc_count_per_shard": 100000
         },
         "map": "//////// FIELD INFO\n\n//TODO: add field regex\n\ndef buildFieldSpec_() {\n   def spec = [:];\n   spec.last_id = \"\";\n   spec.count = 0;\n   spec.doc_count = 0;\n   spec.samples = new HashSet();\n   spec.type_freqs = [:];\n   spec.min = null;\n   spec.max = null;\n   spec.sum = 0;\n   return spec;\n}\n\ndef updateFieldInfoSpec_(def id, def spec, def val, def params) {\n   if (id != spec.last_id) {\n      spec.last_id = id;\n      spec.doc_count++;\n   } else {\n      spec.type_freqs.compute(\"list\", (k, v) -> (null == v) ? 1 : v + 1);\n   }\n   if (val instanceof Number) {\n      if ((spec.min == null) || (val < spec.min)) spec.min = val;\n      if ((spec.max == null) || (val > spec.max)) spec.max = val;\n      spec.sum += val;\n      spec.type_freqs.compute(\"number\", (k, v) -> (null == v) ? 1 : v + 1);\n   } else if (val instanceof String) {\n      if (spec.samples.size() < params.max_string_samples) {\n         def sample = val;\n         if (sample.length() > 64) {\n            sample = sample.substring(0, 64) + \"...\";\n         }\n         spec.samples.add(sample);\n      }\n      spec.type_freqs.compute(\"string\", (k, v) -> (null == v) ? 1 : v + 1);\n   } else if (val instanceof Boolean) {\n      spec.type_freqs.compute(\"boolean\", (k, v) -> (null == v) ? 1 : v + 1);\n   } else {\n      spec.type_freqs.compute(\"unknown\", (k, v) -> (null == v) ? 1 : v + 1);\n   }\n   spec.count++;\n   return spec;\n}\n\n//////// UTILS\n\n//TODO: if params.fieldLookup listed then can load all doc_fields\n//as an alternative\n//(\"docfields\": \"$$lookupMap()\")\n\ndef flatten_(def id, def inMap, def fieldPath, def state, def params) {\n   inMap.entrySet().forEach(kv -> {\n      def newFieldPath = (fieldPath.isEmpty() ? \"\" : fieldPath + \".\") + kv.getKey();\n      if (kv.getValue() instanceof Map) {\n         flatten_(id, kv.getValue(), newFieldPath, state, params);\n      } else if (kv.getValue() instanceof List) {\n         def fakeMap = [:];\n         kv.getValue().forEach(v -> {\n            fakeMap.put(newFieldPath, v);\n            flatten_(id, fakeMap, newFieldPath, state, params);\n         });\n      } else {\n         state.collect.compute(newFieldPath, (k, v) -> {\n           def curr = (null == v) ?  buildFieldSpec_() : v;\n           updateFieldInfoSpec_(id, curr, kv.getValue(), params);\n         });\n      }\n   });\n}\n\n//////// LOGIC\n\nif ((params.max_doc_count_per_shard <= 0) || (state.doc_count < params.max_doc_count_per_shard)) {\n   if ((params.sub_sample_ratio <= 0) || (0 == (state.index % params.sub_sample_ratio))) {\n      flatten_(doc[\"_id\"].value, params._source, \"\", state, params);\n      state.doc_count++;\n   }\n   state.index++;\n}\n\n\n",
         "combine": "//(nothing to do on shard completion)\nreturn state;"
      },
      "enabled": true,
      "query": {
         "_source": "$$field_filters",
         "query": {
            "bool": {
               "filter": [],
               "must_not": [],
               "should": [],
               "must": [
                  {
                     "query_string": {
                        "query": "$$query"
                     }
                  }
               ]
            }
         }
      }
   },
   "common": {
      "headers": {
         "position": "top",
         "field_filters": [
            "# eg -x.*.y / +x.y (start with -s where possible)",
            "# pre-built groups: $$<name>",
            "#(note fields are laid out in match order)",
            "# Ignore these by default",
            "-data_explorer.value.count",
            "-data_explorer.value.doc_count",
            "",
            ""
         ],
         "exclude_filtered_fields_from_autocomplete": true,
         "field_aliases": [
            "#field.path=Alias To Use",
            "#(note fields are laid out in order within filter matches)",
            "data_explorer.value.field_path=Field",
            "data_explorer.value.types=Types",
            "data_explorer.value.present_pct=Present(%)",
            "data_explorer.value.vals_per_doc=Vals/Doc",
            "data_explorer.value.avg=Average",
            "data_explorer.value.min=Min",
            "data_explorer.value.max=Max",
            "data_explorer.value.string_samples=Samples",
            "",
            ""
         ],
         "autocomplete_filters": [
            "# eg x, -x.*.y, +x.y (start with -s if possible)",
            "# pre-built groups: $$<name>"
         ]
      },
      "pagination": {
         "local": {
            "position": "bottom"
         },
         "source": "none"
      },
      "query": {
         "local": {
            "position": "top"
         },
         "source": "none"
      },
      "skip": {
         "rows": "",
         "cols": ""
      },
      "formatting": {
         "theme": "minimal"
      },
      "status": {
         "merge": false,
         "position": "top"
      }
   },
   "data_table": {
      "enabled": false,
      "query": {
         "from": "$$pagination_from",
         "_source": "$$field_filters",
         "size": "$$pagination_size",
         "query": {
            "bool": {
               "filter": [],
               "must_not": [],
               "should": [],
               "must": [
                  {
                     "query_string": {
                        "query": "$$query"
                     }
                  }
               ]
            }
         }
      }
   },
   "trigger": "content_change",
   "sql_table": {
      "enabled": false,
      "query": "--SHOW TABLES\n--DESCRIBE $$index\n--SELECT * FROM $$index WHERE $$query $$pagination"
   },
   "cat_table": {
      "options": [],
      "endpoint": "",
      "enabled": false
   }
}
