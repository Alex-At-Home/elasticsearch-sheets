var TestSidebarAppScriptFieldsForm = (function(){
  var testSuiteRoot = "testSidebarAppScriptFieldsForm"

  /** Add new aggregation forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] Add new forms`, function(assert) {
    var done = assert.async()
    var testRoot = testSuiteRoot + "_addNewForms"
    var extraDivs =
    `
    <div id="fieldTest"></div>
    `
    Fixtures.withParentDivAndGlobalEditor(testRoot, extraDivs, {}, function(globalEditor) {
      ScriptFieldsForm.build(0, "data_table", globalEditor, "fieldTest")

      var formElements = $(`#${testRoot} .aggregation_form_element`)
      assert.equal(formElements.length, 1, "Added script field forms")
      var expectedMr = {}
      var expectedJsonStr = JSON.stringify({
        data_table: {
          script_fields: [ {} ]
        }
      }, null, 3)
      //(because no JSON => is new element so gets added to array)
      assert.equal(globalEditor.session.getValue(), expectedJsonStr, "Global editor updated")

      done()
    }, /*keepDiv*/false)
  })

  /** Add a existing metric form to an empty list */
  QUnit.test(`[${testSuiteRoot}] Add existing form`, function(assert) {
    var done = assert.async()
    var testRoot = testSuiteRoot + "_addExistingMetricForm"
    Fixtures.withParentDivAndGlobalEditor(testRoot, "", {}, function(globalEditor) {
      var jsonForm = {
        name: "test_name",
        script: "painless_code"
      }
      ScriptFieldsForm.build(0, "metric", globalEditor, testRoot, jsonForm)

      var formElements = $(`#${testRoot} .aggregation_form_element`)
      assert.equal(formElements.length, 1, "Added aggregation form")
      //(not a new element, so doesn't insert anything into the JSON)
      assert.equal(globalEditor.session.getValue(), "{}", "Global editor updated")

      var formId = formElements[0].id
      var nameId = formId.replace("form_", "name_")
      assert.equal($(`#${testRoot} #${nameId}`).val(), jsonForm.name, "Name correctly populated")
      assert.equal($(`#${testRoot} #${nameId}`).attr('readonly'), "readonly", "Name is readonly")
      var formEditorId = formId.replace("form_", "editor_")
      var formEditor = ace.edit(formEditorId)
      assert.equal(formEditor.session.getValue(), jsonForm.script, "JSON form editor correctly populated")

      done()
    }, /*keepDiv*/false)
  })

  //TODO delete form element
  //TODO move form element
  //TODO check each value updates global editor
  //TODO updating name
}())
