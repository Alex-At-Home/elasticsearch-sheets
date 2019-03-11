var TestSidebarAppFieldsEditor = (function(){
  var testSuiteRoot = "testSidebarAppFieldsEditor"

  QUnit.test(`[${testSuiteRoot}] Add new forms of each type`, function(assert) {
    var done = assert.async()
    var testRoot = testSuiteRoot + "_addNewEditor"
    var extraDivs = FieldsEditor.buildHtmlStr(0, "test_table_type")
    var mockServiceEventBus = []

    var serviceOverrides = [
      {
        service: AutocompletionManager,
        method: "registerFilterList",
        overrideFn: function(id, filters) {
          mockServiceEventBus.push({
            "name": "registerFilterList",
            "id": id,
            "filters": filters
          })
        }
      }
    ]
    var checkEventBus = function(expectedFilters) {
      var expected = expectedFilters.map(function(filterEl) {
        return {
          "name": "registerFilterList", "id": "field_filter_0", filters: filterEl
        }
      })
      assert.deepEqual(mockServiceEventBus, expected, "Registered field list with autocompletion")
      mockServiceEventBus = [] //(reset for next test)
    }

    Fixtures.withParentDivAndGlobalEditor(testRoot, extraDivs, {}, function(globalEditor) {
      Fixtures.withMocks(serviceOverrides, function() {

        var testJson = { common: {
          headers: {
            field_filters: [ "test_filter_1", "test_filter_2" ],
            field_aliases: [ "field_aliases_1", "field_aliases_2" ],
            exclude_filtered_fields_from_autocomplete: true
          }
        }}
        FieldsEditor.register(0, "test_name", testJson, globalEditor, "test_table_type")

        setTimeout(function() {
          // Check registered:
          checkEventBus([
            testJson.common.headers.field_filters
          ])

          var fieldFilter = ace.edit("field_filter_test_table_type_0").session
          assert.equal(fieldFilter.getValue(), "test_filter_1\ntest_filter_2", "Field filter set")

          var fieldAlias = ace.edit("field_aliases_test_table_type_0").session
          assert.equal(fieldAlias.getValue(), "field_aliases_1\nfield_aliases_2", "Field alias set")

          assert.equal($("#exclude_test_table_type_0").prop("checked"), true, "Field exclude checkbox set")

          fieldFilter.setValue("a\nb\nc")
          fieldAlias.setValue("x\ny\nz")
          $("#exclude_test_table_type_0").click()
          setTimeout(function() {
            var expectedGlobalJson = { common: {
              headers: {
                field_filters: [ "a", "b", "c" ],
                field_aliases: [ "x", "y", "z" ],
                exclude_filtered_fields_from_autocomplete: false
              }
            }}
            var expectedGlobalJsonStr = JSON.stringify(
              expectedGlobalJson, null, 3
            )
            assert.equal(globalEditor.session.getValue(), expectedGlobalJsonStr, "Event handlers all registered")
            // Check registered:
            checkEventBus([
              expectedGlobalJson.common.headers.field_filters,
                //(this extra call comes from the delete+insert events)
              expectedGlobalJson.common.headers.field_filters,
              []
            ])

            done()
          }, 400)
        })
      })
    }, /*keepDiv*/false)
  })


}())
