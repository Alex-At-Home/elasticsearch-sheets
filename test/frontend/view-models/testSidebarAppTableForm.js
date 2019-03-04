var TestSidebarTableForm = (function() {
  var testSuiteRoot = "testSidebarTableForm"

  /** Add new table forms to an empty list */
  QUnit.test(`[${testSuiteRoot}] Add new forms of each type`, function(assert) {
    var done = assert.async();
    var testRoot = testSuiteRoot + "_addNewForms"
    var parentContainer = "<div id='accordion'></div>"
    Fixtures.withParentDiv(testRoot, parentContainer, function() {
      var jsonElement1 = { "k": "v"}
      var jsonElements = [ jsonElement1 ]
      TableForm.buildAccordionElement(
        0, "<i>test_first</i>", jsonElement1, /*isFirstElement*/true, /*standaloneEdit*/false
      )

      for (var index = 1; index < 2; ++index) {
        var jsonElement = { "k": "v" + index }
        TableForm.buildAccordionElement(
          index, "test_sub" + index, jsonElement, /*isFirstElement*/false, /*standaloneEdit*/false
        )
        jsonElements.push(jsonElement)
      }
      var formElements = $(`#${testRoot} .table_form_element`)
      assert.equal(formElements.length, index, "Added table forms")

      for (var index = 0; index < 2; ++index) {
        // Subsequent elements
        var formId = formElements[index].id
        var title = formId.replace("accordion_", "toggleCollapse")
        var expectedTitle = (0 == index) ? "<i>test_first</i>" : `test_sub${index}`
        assert.equal($(`#${testRoot} #${title} b`).html(), expectedTitle, `el ${index} title matches`)
        var expectedName = (0 == index) ? "" : expectedTitle
        var name = formId.replace("accordion_", "name_")
        assert.equal($(`#${testRoot} #${name}`).val(), expectedName, `el ${index} name matches`)
        assert.equal($(`#${testRoot} #${name}`).attr("readonly") == "readonly", (index != 0), `el ${index} name readonly`)
        var editorId = formId.replace("accordion_", "editor_")
        var codeEditor = ace.edit(editorId)
        var jsonStr = codeEditor.session.getValue()
        assert.equal(jsonStr, JSON.stringify(jsonElements[index], null, 3), `el ${index} JSON matches`)
        var menuItems = $(`#${testRoot} #${formId} .dropdown-item`).map(function(i, el) {
          return $(el).text();
        }).get().join(",")
        var expectedMenuItems = (0 == index) ? "Expand Editor,View Query" : "Show/Move/Resize Range,Refresh Table,Expand Editor,View Query"
        assert.equal(expectedMenuItems, menuItems, `el ${index} correct menu items`)
        var buttons = $(`#${testRoot} #${formId} .accordion_button`).map(function(i, el) {
          return $(el).text();
        }).get().join(",")
        var expectedButtons = (0 == index) ? "Create,Test,Cancel" : "Update,Reset,Delete"
        assert.equal(expectedButtons, buttons, `el ${index} correct button options`)
        //TODO: check re-populates all the child types when the JSON is edited
      }
      done()
    })
  })

  //TODO test "temp" construct
  //TODO standalone edit mode
  //TODO check all the event handlers work (including JSON binding)
}())
