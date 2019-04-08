# Configure Elasticsearch

## Basic configuration

The most common configuration options are available from a dialog launched by `Add Ons > Elastic Sheets > Configure Elasticsearch`

<<pic>>

The password options are:
* Anonymous: no authentication information is appended to the Elasticsearch requests
* Local user/password: Adds basic authentication to all requests, and the user/password is stored in the Google Sheets user metadata - this has two implications:
   * No other Sheets user can see the password regardless of sharing settings.
   * Users with whom the spreadsheet is shared will have to enter their own user/password to interact with Elasticsearch.
* Global user/password: also uses "basic auth" but stores the user and password in the "Management sheet" (see below under "Advanced Configuration")
   * WARNING: only use this option if you are happy with the password being visible to anyone  who can see the spreadsheet

## Advanced configuration

The Elasticsearch and add-on configuration options stored in a sheet called "__xxx__".  Some of these are settable from the UI, as described above. More advanced options can be set directly in the spreadsheet.

<<pic>>

* headers: A JSON object that defines extra headers appended to every request. This option is read dynamically.
* query trigger: xxx. This option requires a reload of the Table Builder from the `Add Ons > Elastic Sheets` menu.
* query trigger time: xxx. The frequency with which the Table Builder sidebar queries the Google App server, defaulting  to 5s. The longer this time, the more time it takes for a spreadsheet change to trigger a refresh.

### Trigger policy

Xxx
