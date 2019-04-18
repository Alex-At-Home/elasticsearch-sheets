var AggregationEditor = (function(){
  /** The non-dynamic (bucket/metric) fields for aggregations */
  var mapReduceFields_ = [ "query", "params", "init", "map", "combine", "reduce", "lib" ]

  /** Builds the forms that define the generation of Aggregation queries */
  function buildHtmlStr(index, standaloneEdit) {
    var groupCollapse = standaloneEdit ? '' : `data-parent="#accordion_agg_${index}"`

    var showBuildFromTemplate = (0 != index) ? "" :
    `
    <div class="panel-body">
    <div class="btn-toolbar">
    <div class="btn-group">
    <button type="button" data-toggle="dropdown" class="btn btn-default dropdown-toggle">Build From Template <span class="caret"></span></button>
    <ul class="dropdown-menu">
        <li><a id="dataexplorer_template_${index}">Data Explorer</a></li>
    </ul>
    </div>
    </div>
    </div>
    `

    var accordion =
    `
    <div id="accordion_agg_${index}" class="panel-group">

    <div class="panel panel-default">
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_general_agg_${index}">General</a>
    </h4>
    </div>
    <div id="accordion_general_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${GeneralEditor.buildHtmlStr(index, 'agg')}
    </div>
    </div>
    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_agg_${index}" href="#accordion_fields_agg_${index}">Fields</a>
    </h4>
    </div>
    <div id="accordion_fields_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body form-horizontal">
    ${FieldsEditor.buildHtmlStr(index, 'agg')}
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_query_agg_${index}">Query</a>
    </h4>
    </div>
    <div id="accordion_query_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div class="input-group">
    <div class="input-group-addon for-shorter-text">
    <span class="input-group-text">Indices</span>
    </div>
    <input type="text" class="form-control" placeholder="Index Pattern" value="" id="index_agg_${index}">
    </div>
    <div id="query_agg_${index}" class="medium_ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" data-parent="#accordion_agg_${index}" href="#accordion_script_fields_agg_${index}">Script Fields</a>
    </h4>
    </div>
    <div id="accordion_script_fields_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="script_fields_agg_${index}"></div>
    <div class="btn-toolbar">
    <button class="btn btn-default" id="add_script_field_agg_${index}">Add Scripted Field</button>
    </div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_buckets_agg_${index}">Buckets (eg groupings)</a>
    </h4>
    </div>
    <div id="accordion_buckets_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="buckets_agg_${index}"></div>
    <div class="btn-toolbar">
    <button class="btn btn-default" id="add_bucket_agg_${index}">Add Bucket</button>
    </div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_metrics_agg_${index}">Metrics (inc Map Reduce)</a>
    </h4>
    </div>
    <div id="accordion_metrics_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="metrics_agg_${index}"></div>
    <div class="btn-toolbar">
    <button class="btn btn-default" id="add_metric_agg_${index}">Add Metric</button>
    </div>
    <div class="btn-toolbar">
    <button class="btn btn-default" id="add_mapr_agg_${index}">Add Map Reduce Task</button>
    </div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_pipelines_agg_${index}">Pipelines (eg sort/filter)</a>
    </h4>
    </div>
    <div id="accordion_pipelines_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="pipelines_agg_${index}"></div>
    <div class="btn-toolbar">
    <button class="btn btn-default" id="add_pipeline_agg_${index}">Add Pipeline</button>
    </div>
    </div>
    </div>

    <!------------------------------------------------------------------------------------->
    <hr/>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_params_agg_${index}">(MR) Parameters</a>
    </h4>
    </div>
    <div id="accordion_params_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="params_agg_${index}" class="medium_ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_init_agg_${index}">(MR) Init Script</a>
    </h4>
    </div>
    <div id="accordion_init_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="init_agg_${index}" class="medium_ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_map_agg_${index}">(MR) Map Script</a>
    </h4>
    </div>
    <div id="accordion_map_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="map_agg_${index}" class="ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_combine_agg_${index}">(MR) Combine Script</a>
    </h4>
    </div>
    <div id="accordion_combine_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="combine_agg_${index}" class="ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_reduce_agg_${index}">(MR) Reduce Script</a>
    </h4>
    </div>
    <div id="accordion_reduce_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="reduce_agg_${index}" class="ace_editor"></div>
    </div>
    </div>

    <div class="panel-heading">
    <h4 class="panel-title">
    <a data-toggle="collapse" ${groupCollapse} href="#accordion_lib_agg_${index}">(MR) Library Functions</a>
    </h4>
    </div>
    <div id="accordion_lib_agg_${index}" class="panel-collapse collapse out">
    <div class="panel-body">
    <div id="lib_agg_${index}" class="ace_editor"></div>
    </div>
    </div>
    </div>

    ${showBuildFromTemplate}

    </div>
    `
    return accordion
  }

  /** Handles elements that need custom redraw logic if the underlying fields were changed */
  function onSelect(index, selected, globalEditor) {
    // Update top-level JSON since we're switching mode
    Util.updateRawJsonNow(globalEditor, function(currJson) {
      var aggregationTable = Util.getOrPutJsonObj(currJson, [ "aggregation_table" ])
      aggregationTable.enabled = selected
    })
    // Display redraw:
    if (selected) {
      //TODO bucket and metrics
      // MR params
      mapReduceFields_.forEach(function(field) {
        ace.edit(`${field}_agg_${index}`).resize()
      })
    }
    FieldsEditor.onSelect(index, selected, globalEditor, 'agg')
  }

  /** Populate the data for this form */
  function populate(index, name, json, globalEditor) {

    // General

    GeneralEditor.populate(index, name, json, 'agg')
    FieldsEditor.populate(index, name, json, globalEditor, 'agg')

    // Index:
    var indexPattern = Util.getJson(json, [ "aggregation_table", "index_pattern" ]) || ""
    $(`#index_agg_${index}`).val(indexPattern)

    // Buckets and metrics

    // Clear any existing elements
    $(`#pipelines_agg_${index}`).empty()
    $(`#metrics_agg_${index}`).empty()
    $(`#buckets_agg_${index}`).empty()

    var buckets = Util.getJson(json, [ "aggregation_table", "buckets" ]) || []
    buckets.forEach(function(bucket) {
      AggregationForm.build(index, 'bucket', globalEditor, `buckets_agg_${index}`, bucket)
    })
    var metrics = Util.getJson(json, [ "aggregation_table", "metrics" ]) || []
    metrics.forEach(function(metric) {
      var aggType = 'metric'
      if (metric.map_reduce) {
        aggType = 'map_reduce'
      }
      AggregationForm.build(index, 'metric', globalEditor, `metrics_agg_${index}`, metric)
    })
    var pipelines = Util.getJson(json, [ "aggregation_table", "pipelines" ]) || []
    pipelines.forEach(function(pipeline) {
      AggregationForm.build(index, 'pipeline', globalEditor, `pipelines_agg_${index}`, pipeline)
    })

    // MR
    mapReduceFields_.forEach(function(field) {
      var fieldPath = [ "aggregation_table", "map_reduce", field ]
      if ("query" == field) {
        fieldPath = [ "aggregation_table", field ]
      }
      var mrCode = Util.getJson(json, fieldPath) || "" //TODO: move query off this
      if (("query" == field) || ("params" == field)) { //(these are JSON)
        mrCode = JSON.stringify(mrCode, null, 3)
      }
      ace.edit(`${field}_agg_${index}`).session.setValue(mrCode)
    })

    // Clear any existing script fields and rebuild
    $(`#script_fields_agg_${index}`).empty()
    var scriptFields = Util.getJson(json, [ "aggregation_table", "script_fields" ]) || []
    scriptFields.forEach(function(scriptField) {
      ScriptFieldsForm.build(index, 'aggregation_table', globalEditor, `script_fields_agg_${index}`, scriptField)
    })
  }

  /** Called once all the HTML elements for this SQL table exist, populates the data and registers event handlers */
  function register(index, name, json, globalEditor) {

    GeneralEditor.register(index, name, json, globalEditor, 'agg')
    FieldsEditor.register(index, name, json, globalEditor, 'agg')

    mapReduceFields_.forEach(function(field) {
      var editorId = `${field}_agg_${index}`
      var currMrEditor = ace.edit(editorId)
      if (("query" == field) || ("params" == field)) {
        currMrEditor.session.setMode("ace/mode/json")
      } else {
        currMrEditor.session.setMode("ace/mode/java")
      }
      currMrEditor.session.setTabSize(3)
      currMrEditor.session.setUseWrapMode(true)
      //contents set from "populate" below

      //Autocompletion:
      switch(field) {
        case "params":
          currMrEditor.setOptions({
              enableBasicAutocompletion: true,
              enableSnippets: true,
              enableLiveAutocompletion: true
          })
          currMrEditor.completers = [
            AutocompletionManager.paramsCompleter
          ]
          break
        case "query":
          currMrEditor.setOptions({
              enableBasicAutocompletion: true,
              enableSnippets: true,
              enableLiveAutocompletion: true
          })
          currMrEditor.completers = [
            AutocompletionManager.dataFieldCompleter(`index_agg_${index}`, "raw"),
            AutocompletionManager.paramsCompleter,
            AutocompletionManager.queryCompleter,
            AutocompletionManager.queryInsertionCompleter
          ]
          break
        default: //painless
          currMrEditor.setOptions({
              enableBasicAutocompletion: true,
              enableSnippets: true,
              enableLiveAutocompletion: true
          })
          currMrEditor.completers = [
            AutocompletionManager.dataFieldCompleter(`index_agg_${index}`, "painless"),
            AutocompletionManager.painlessCompleter(TableManager.getTableId(index)),
            AutocompletionManager.userDefinedMapReduceParamsCompleter(TableManager.getTableId(index))
          ]
          break
      }
    })

    // Populate all the fields:
    populate(index, name, json, globalEditor)

    // Now add the handlers:

    var onIndexChange = function(thisValue) {
      Util.updateRawJsonNow(globalEditor, function(currJson) {
        var aggTable = Util.getOrPutJsonObj(currJson, [ "aggregation_table" ])
        aggTable.index_pattern = thisValue
      })
    }

    $(`#index_agg_${index}`)
      .on("focusout", function(e) {
        AutocompletionManager.registerIndexPattern(`index_agg_${index}`, TableManager.getTableId(index))
      })
      .autocomplete(AutocompletionManager.getIndexCompleter(onIndexChange))
      .focus(function () {
        if ("" == $(this).val()) { // only insta-display options if textbox empty
          $(this).autocomplete("search", "")
        }
      })

    //(also initialize this on build)
    AutocompletionManager.registerIndexPattern(`index_agg_${index}`, TableManager.getTableId(index))

    $(`#add_bucket_agg_${index}`).click(function(){
      AggregationForm.build(index, 'bucket', globalEditor, `buckets_agg_${index}`)
    })
    $(`#add_metric_agg_${index}`).click(function(){
      AggregationForm.build(index, 'metric', globalEditor, `metrics_agg_${index}`)
    })
    $(`#add_mapr_agg_${index}`).click(function(){
      AggregationForm.build(index, 'map_reduce', globalEditor, `metrics_agg_${index}`)
    })
    $(`#add_pipeline_agg_${index}`).click(function(){
      AggregationForm.build(index, 'pipeline', globalEditor, `pipelines_agg_${index}`)
    })

    // Change triggers for all the MR code
    mapReduceFields_.forEach(function(field) {
      var editorId = `${field}_agg_${index}`
      var currMrEditor = ace.edit(editorId)
      currMrEditor.session.on('change', function(delta) {
        Util.updateRawJson(globalEditor, function(currJson) {
          var codePath = [ "aggregation_table", "map_reduce" ]
          if ("query" == field) {
            codePath = [ "aggregation_table" ]
          }
          var code = Util.getOrPutJsonObj(currJson, codePath)
          if (("query" == field) || ("params" == field)) {
            try {
              code[field] = JSON.parse(currMrEditor.session.getValue())
            } catch (err) {} //(do nothing if it's not valid JSON)
          } else {
            code[field] = currMrEditor.session.getValue()
          }
        })
      })
    })

    // Resize each editor if its accordion is opened
    mapReduceFields_.forEach(function(field) {
      $(`#accordion_${field}_agg_${index}`).on('shown.bs.collapse', function () {
        ace.edit(`${field}_agg_${index}`).resize()
      })
    })
    $(`#accordion_fields_agg_${index}`).on('shown.bs.collapse', function () {
      FieldsEditor.onSelect(index, /*selected*/ true, globalEditor, 'agg')
    })

    // Script fields:
    $(`#add_script_field_agg_${index}`).click(function(){
      ScriptFieldsForm.build(index, 'aggregation_table', globalEditor, `script_fields_agg_${index}`)
    })

    // Build from template:
    if (0 == index) {
      $(`#dataexplorer_template_${index}`).click(function(){
        Util.updateRawJsonNow(globalEditor, function(currJson) {
          return DataExplorerTemplate
        }, /*updateDisplay*/ true)
      })
    }
  }

  return {
    buildHtmlStr: buildHtmlStr,
    populate: populate,
    onSelect: onSelect,
    register: register
  }

}())
