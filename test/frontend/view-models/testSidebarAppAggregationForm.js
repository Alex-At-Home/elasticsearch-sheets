var TestSidebarAppAggregationForm = (function(){
  var testSuiteRoot = "testSidebarAppAggregationForm"

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] Add new forms of each type`, function(assert) {
    var done = assert.async();
    var testRoot = testSuiteRoot + "_addNewForms"
    var extraDivs =
    `
    <div id="bucketTest"></div>
    <div id="metricTest"></div>
    <div id="pipelineTest"></div>
    `
    Fixtures.withParentDivAndGlobalEditor(testRoot, extraDivs, {}, function(globalEditor) {
      AggregationForm.build(0, "bucket", globalEditor, "bucketTest")
      AggregationForm.build(0, "metric", globalEditor, "metricTest")
      AggregationForm.build(0, "map_reduce", globalEditor, "metricTest")
      AggregationForm.build(0, "pipeline", globalEditor, "pipelineTest")

      var formElements = $(`#${testRoot} .aggregation_form_element`)
      assert.equal(formElements.length, 4, "Added aggregation forms")
      var expectedMr = { agg_type: "__map_reduce__" }
      var expectedJsonStr = JSON.stringify({
        aggregation_table: {
          buckets: [ {} ],
          metrics: [ {}, expectedMr ],
          pipelines: [ {} ]
        }
      }, null, 3)
      //(because no JSON => is new element so gets added to array)
      assert.equal(globalEditor.session.getValue(), expectedJsonStr, "Global editor updated")

      done()
    })
  })

  /** Add a existing metric form to an empty list */
  QUnit.test(`[${testSuiteRoot}] Add existing metric form`, function(assert) {
    var done = assert.async();
    var testRoot = testSuiteRoot + "_addExistingMetricForm"
    Fixtures.withParentDivAndGlobalEditor(testRoot, "", {}, function(globalEditor) {
      var jsonForm = {
        name: "test_name",
        agg_type: "avg",
        config: { k: "v" },
        field_filter: "filter_test",
        location: "automatic"
      }
      AggregationForm.build(0, "metric", globalEditor, testRoot, jsonForm)

      var formElements = $(`#${testRoot} .aggregation_form_element`)
      assert.equal(formElements.length, 1, "Added aggregation form")
      //(not a new element, so doesn't insert anything into the JSON)
      assert.equal(globalEditor.session.getValue(), "{}", "Global editor updated")

      var formId = formElements[0].id
      var nameId = formId.replace("form_", "name_")
      assert.equal($(`#${testRoot} #${nameId}`).val(), jsonForm.name, "Name correctly populated")
      assert.equal($(`#${testRoot} #${nameId}`).attr('readonly'), "readonly", "Name is readonly")
      var aggTypeId = formId.replace("form_", "agg_type_")
      assert.equal($(`#${testRoot} #${aggTypeId}`).val(), jsonForm.agg_type, "Agg Type correctly populated")
      var aggTypeId = formId.replace("form_", "help_agg_type_")
      expectedHelpUrl = AggregationInfo.metric.avg.url__
      assert.equal($(`#${testRoot} #${aggTypeId} a`).attr('href'), expectedHelpUrl, "Agg Type has help link")
      var fieldFilterId = formId.replace("form_", "field_filter_")
      assert.equal($(`#${testRoot} #${fieldFilterId}`).val(), jsonForm.field_filter, "Filter Field correctly populated")
      var locationId = formId.replace("form_", "location_")
      assert.equal($(`#${testRoot} #${locationId}`).val(), jsonForm.location, "Filter Field correctly populated")
      var formEditorId = formId.replace("form_", "editor_")
      var formEditor = ace.edit(formEditorId)
      var expectedJson = JSON.stringify(jsonForm.config, null, 3)
      assert.equal(formEditor.session.getValue(), expectedJson, "JSON form editor correctly populated")

      done()
    })
  })

  //TODO mapreduce populated element
  //TODO delete form element
  //TODO move form element
  //TODO check each value updates global editor
  //TODO updating name
  //TODO updating aggregation type
}())
