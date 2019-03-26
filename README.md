# elasticsearch-sheets
An experimental Google Sheets add-on to view and interact with Elasticsearch indices

## Features

![image](https://user-images.githubusercontent.com/17573856/55036844-39af9900-4ff2-11e9-9f39-1edcf0abc3e1.png)

* UI based table creation and management
* `Data table` showing Elasticsearch query results as a table
  * Select which fields to display
  * Summarizes nested JSON arrays
* `Aggregation table` showing Elasticsearch aggregations results as a table
   * A hybrid UI uses the ES DSL to configure individual metrics
   * Autocomplete for both the DSL and the data fields 
   * Includes an integrated "MapReduce" UI with `painless` autocompletion
      * Use cell ranges as lookup tables for the `MapReduce` logic 
* `SQL table` providing an interface to `elasticsearch-sql`
   * SQL and data field autocompletion
* `Management table`
   * Gives access to the `cat` endpoints 
* Safe sharing of the spreadsheet
   * password or anonymous access to Elasticsearch from the browser

## Installation

The intention is for this project to be consumable as a Google Sheets add-on

In the meantime, the following steps allow it to be demo'd (or used from source):
* Install [`clasp`](https://developers.google.com/apps-script/guides/clasp)
* Login via `clasp login` (follow oauth instructions to authenticate via Google)
* `cd` to `elasticsearch-sheets/elastic-sheets-project` and run `clasp create elasticSheetsProjects` 
* `cd` to `elasticsearch-sheets` and run `sh build-elastic-sheets-project.sh`
* Visit [script.google.com](https://script.google.com) - there should now be a project `Elastic-sheets-project`
   * (Taken from the directory name, see below)
* Click on the `Open Container` project to open a spreadsheet with the script attached (requires clicking through a bunch of permissions/disclaimers first time)
* _To create multiple spreadsheets, rename the `elastic-sheets-project` multiple times, delete the `.clasp.json` inside the dir, and repeat the `clasp create <projectname>` and `sh build-elastic-sheets-project.sh` steps_
