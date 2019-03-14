var TestSidebarAppFieldsEditor = (function(){
  var testSuiteRoot = "testSidebarAppFieldsEditor"

  var tableTypes = {
      "mgmt": {
        supports_autocomplete: false,
        has_checkbox: false,
        has_separate_autocomplete: false
      },
      "agg": {
        supports_autocomplete: true,
        has_checkbox: false,
        has_separate_autocomplete: true
      },
      "sql": {
        supports_autocomplete: true,
        has_checkbox: true,
        has_separate_autocomplete: false
      }
  }

  Object.keys(tableTypes).forEach(function(tableType) {
    var expectation = tableTypes[tableType]

    QUnit.test(`[${testSuiteRoot}] Add new forms of each type [${tableType}]`, function(assert) {
      var done = assert.async()
      var testRoot = testSuiteRoot + "_addNewEditor_" + tableType
      var extraDivs = FieldsEditor.buildHtmlStr(0, tableType)
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
        var expected =
          expectedFilters.map(function(filterEl) {
            return {
              "name": "registerFilterList", "id": "field_filter_0", filters: filterEl
            }
          })
        assert.deepEqual(mockServiceEventBus, expected, `[${tableType}] Registered field list with autocompletion`)
        mockServiceEventBus = [] //(reset for next test)
      }

      Fixtures.withParentDivAndGlobalEditor(testRoot, extraDivs, {}, function(globalEditor) {
        Fixtures.withMocks(serviceOverrides, function() {

          var testJson = { common: {
            headers: {
              field_filters: [ "test_filter_1", "test_filter_2" ],
              field_aliases: [ "field_aliases_1", "field_aliases_2" ],
              autocomplete_filters: [ "test_auto_1", "test_auto_2" ],
              exclude_filtered_fields_from_autocomplete: true
            }
          }}
          FieldsEditor.register(0, "test_name", testJson, globalEditor, tableType)

          setTimeout(function() {
            // Check registered:
            var expectedBusTraffic = []
            if (expectation.has_separate_autocomplete) {
              expectedBusTraffic = [testJson.common.headers.autocomplete_filters] //TODO
            } else if (expectation.supports_autocomplete) {
              expectedBusTraffic = [testJson.common.headers.field_filters]
            }
            checkEventBus(expectedBusTraffic)

            var fieldFilter = ace.edit(`field_filter_${tableType}_0`).session
            assert.equal(fieldFilter.getValue(), "test_filter_1\ntest_filter_2", `[${tableType}] Field filter set`)

            var fieldAlias = ace.edit(`field_aliases_${tableType}_0`).session
            assert.equal(fieldAlias.getValue(), "field_aliases_1\nfield_aliases_2", `[${tableType}] Field alias set`)

            if (expectation.has_separate_autocomplete) {
              var autoFieldFilter = ace.edit(`autocomplete_filter_${tableType}_0`).session
              assert.equal(autoFieldFilter.getValue(), "test_auto_1\ntest_auto_2", `[${tableType}] Autocomplete filter set`)
            } else {
              var formElements = $(`#${testRoot} #autocomplete_filter_${tableType}_0`)
              assert.equal(formElements.length, 0, `[${tableType}] Separate autocomplete form not added`)
            }

            if (expectation.has_checkbox) {
              assert.equal($(`#exclude_${tableType}_0`).prop("checked"), true, `[${tableType}] Field exclude checkbox set`)
            } else {
              var formElements = $(`#${testRoot} #exclude_${tableType}_0`)
              assert.equal(formElements.length, 0, `[${tableType}] Separate checkbox not added`)
            }

            fieldFilter.setValue("a\nb\nc")
            fieldAlias.setValue("x\ny\nz")
            if (expectation.has_separate_autocomplete) {
              autoFieldFilter.setValue("1\n2\n3")
            }
            if (expectation.has_checkbox) {
              $(`#exclude_${tableType}_0`).click()
            }
            setTimeout(function() {
              var expectedGlobalJson = { common: {
                headers: {
                  field_filters: [ "a", "b", "c" ],
                  field_aliases: [ "x", "y", "z" ]
                }
              }}
              if (expectation.has_checkbox) {
                expectedGlobalJson.common.headers.exclude_filtered_fields_from_autocomplete = false
              }
              if (expectation.has_separate_autocomplete) {
                expectedGlobalJson.common.headers.autocomplete_filters =
                  [ "1", "2", "3" ]
              }
              var expectedGlobalJsonStr = JSON.stringify(
                expectedGlobalJson, null, 3
              )
              assert.equal(globalEditor.session.getValue(), expectedGlobalJsonStr, `[${tableType}] Event handlers all registered`)
              // Check registered:
              var expectedBusTraffic = []
              if (expectation.has_separate_autocomplete) {
                expectedBusTraffic =
                [
                  expectedGlobalJson.common.headers.autocomplete_filters,
                    //(this extra call comes from the delete+insert events)
                  expectedGlobalJson.common.headers.autocomplete_filters
                ]
              } else if (expectation.supports_autocomplete){
                expectedBusTraffic =
                [
                  expectedGlobalJson.common.headers.field_filters,
                    //(this extra call comes from the delete+insert events)
                  expectedGlobalJson.common.headers.field_filters,
                  []
                ]
              }
              checkEventBus(expectedBusTraffic)

              done()
            }, 250)
          })
        })
      }, /*keepDiv*/false)
    })
  })


}())
