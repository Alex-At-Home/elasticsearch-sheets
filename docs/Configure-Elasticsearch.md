# Configure Elasticsearch

## Before starting

This Add On uses [CORS](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html) to communicate with Elasticsearch, so this must be enabled first in the YAML, for example:

```yaml
http.cors.enabled: true
http.cors.allow-origin: "*"
http.cors.allow-headers: "Authorization, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
http.cors.allow-credentials: true
```

If not you will get an error like `msg = [No Living connections]`, which will also be the case if
you accidentally point at Kibana instead of Elasticsearch.

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

   The Elasticsearch and add-on configuration options stored in a sheet called "__xxx__".  Some of these are settable from the UI, as described above. More advanced options can be set directly in the spreadsheet.

   <<pic>>

   * enabled: if `FALSE` then the Add On never communicates with Elasticsearch
   * headers: A JSON object that defines extra headers appended to every request. This option is read dynamically.
   * client options: passed directly to the [javascript Elasticsearch client]()
   * version : passed directly to the [javascript Elasticsearch client]()
   * query trigger: xxx. This option requires a reload of the Table Builder from the `Add Ons > Elastic Sheets` menu. Table triggers and refreshes are discussed below.
   * query trigger time: xxx. The frequency with which the Table Builder sidebar queries the Google App server, defaulting to 5s. The longer this time, the more time it takes for a spreadsheet change to trigger a refresh.

   ### Trigger policy

   In order to understand the "query trigger" parameter it is helpful to summarize how triggers and table refreshes work in general.

   First note that all communications with the Elasticsearch cluster occur via the "Table builder" sidebar. If the sidebar is not launched (in at least one browser connected to the spreadsheet) then the table will never change. The sidebar polls the Google servers every "query trigger time" (cell XXX) seconds (if a URL and password/anon has been configured in the [Basic Configuration]).

   The default options give the standard behavior that any change to the table that changes the data in the table results in a table refresh, so it should rarely be necessary to change them.

   Once a table has been built for the first time, the following different events can cause it to be refreshed:
   * "Manual" (`manual`) - the user requests that the table be refreshed, via `Add One > Elastic Sheets > Refresh active table` (documented [here]), or via `Refresh table` of the table management controls documented [here].
      * (always applied unless the table trigger is configured as `disabled`, see [Table docs])
   * "Configuration event" (`config_change`) - the table configuration has changed via the `Update` button of the table management controls documented [here].
      * (applied unless the table trigger is configured as `disabled` or `manual`, see [Table docs])
   * "Control event" (`control_change`) - the control elements on the table itself (query bar and pagination, see [Table Layout]()) have changed
      * (applied if the table trigger is configured as `control_change` or `content_change`, see [Table docs], note `control_change` is the default and is desirable in most cases)
   * "Content  event" (`content_change`) - any cell in the table has been edited.
      * (only applied if the table trigger is configured as `content_event`, see [Table docs])

   If the trigger policy does not result in a table refresh on a table change, then the "Status" cell (see [Table Layout]()) is updated with "HAND EDITED" and the last date of change, if present.

   Finally, the "query trigger" setting (cell XXX) can take the following values:
   * `none` - the only user action that will trigger a table refresh is  `Refresh table` of the table management controls documented [here].
   * `timed_config` - only manual refreshes and `config_change` events will be polled for
   * `timed_control` - `config_change` and `control_change` events will be polled for, as well as manual refreshes
   * `timed_config` - all events events will be polled for.
