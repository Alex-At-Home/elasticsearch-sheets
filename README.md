# elasticsearch-sheets
An experimental Google Sheets add-on to view and interact with Elasticsearch indices

![image](https://user-images.githubusercontent.com/17573856/55036844-39af9900-4ff2-11e9-9f39-1edcf0abc3e1.png)

## Features

* UI based table creation and management
* `Data table` showing Elasticsearch query results as a table
  * Select which fields to display
  * Summarizes nested JSON arrays
* `Aggregation table` showing Elasticsearch aggregations results as a table
   * A hybrid UI uses the ES DSL to configure individual metrics
   * Autocomplete for both the DSL and the data fields
   * Includes an integrated "MapReduce" UI with `painless` autocompletion
      * Use cell ranges as lookup tables for the `MapReduce` logic
   * A `"Data Explorer"` template that provides a summary for each field in the dataset
* `SQL table` providing an interface to `Elasticsearch SQL`
   * SQL and data field autocompletion
* `Management table`
   * Gives access to the `cat` endpoints
* Safe sharing of the spreadsheet
   * password or anonymous access to Elasticsearch from the browser

## Getting started

After installation (see below), simply:
* select a range in one of the sheets, pick a table type from `Build New Table...`,
* add the index/indices to search to `Query > Indices` or `SQL > Indices`
* perform any other configuration (eg uncomment a SQL command, choose some aggregations, pick some fields), and `Create` or `Test` it

More demos can be found [here](https://github.com/Alex-At-Home/elasticsearch-sheets/blob/master/Demos.md)

![elastic-sheets](https://user-images.githubusercontent.com/17573856/55447647-8e26bb80-5592-11e9-81e9-335d59d43879.gif)

## Installation

The intention is for this project to be consumable as a Google Sheets add-on

In the meantime, if you trust me (general disclaimer: please don't unless you have some reason to!), request a share of [this spreadsheet](https://docs.google.com/spreadsheets/d/1b-6Ut21fmGHNdUWLtmJNRZkRiOBOjFNaMyYBxae4dyk/edit#gid=0), and make a copy of it.
The menu options will be available under `Add-ons > Elastic-sheets-share`.
(It may be necessary to open/close the `Add-Ons` dialog before the menu item appears).
To use the functionality you will have to grant it whatever permissions it wants. The original spreadsheet lists the current release status.

Alternatively, the following steps allow it to be built and used from source:
* Install [`clasp`](https://developers.google.com/apps-script/guides/clasp)
* Login via `clasp login` (follow oauth instructions to authenticate via Google)
* `cd` to `elasticsearch-sheets/elastic-sheets-project` and run `clasp create elasticSheetsProjects`
* `cd` to `elasticsearch-sheets` and run `sh build-elastic-sheets-project.sh elastic-sheets-project`
* Visit [script.google.com](https://script.google.com) - there should now be a project `Elastic-sheets-project`
   * (Taken from the directory name, see below)
* Click on the `Open Container` project to open a spreadsheet with the script attached (requires clicking through a bunch of permissions/disclaimers first time)
* _To create multiple spreadsheets, rename the `elastic-sheets-project` multiple times, delete the `.clasp.json` inside the dir, and repeat the `clasp create <projectname>` and `sh build-elastic-sheets-project.sh` steps. Or just create copies of an existing spreadsheet._

### Privacy Policy

If you are using the Google Sheets add-on version of this in the marketplace (or in fact any of the ways of deploying this), please note I do not nor will I ever store or export any user data from your account. This section is added for compliance with the [Google API terms of service](https://developers.google.com/terms/api-services-user-data-policy).

## Testing

To run the unit/integration tests:
* Front-end: navigate to `file://<path>/elasticsearch-sheets/test/frontend/testFramework.html`
  in any browser
* Server-side: from any spreadsheet with the scripts directly attached (as described above),
  launch the script editor, open `TestService.gs` and execute `testRunner`.
  The results will appear in a sheet called `__ES_SHEETS_TEST__`
