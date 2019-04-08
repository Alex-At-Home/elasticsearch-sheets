# General concepts

Elastic sheets lets you associate a selected range of a [Google Sheet] with a stored "view" of one or more [Elasticsearch indices], which we will call a Table. This view can be a query, an [aggregation], a [SQL statement], or even a [MapReduce script written in painless].

To create a new Table (having configured the connected Elasticsearch),  launch the "Elasticsearch Table Builder" sidebar from the `Add Ons > Elastic Sheets` menu, click on "Build new table..." and then select one of the table types:

<<pic>>

* Data table ([docs]), for an Elasticsearch query
* Aggregation/MapReduce table ([docs]), for an Elasticsearch aggregation (including a [set of UI components allowing MapReduce functionality] via the [`scripted_metric`])
* SQL table ([docs], requires a Stack license)
* Management table ([docs]), allowing access to the [family of `_cat` endpoints]

Each of these tables has a set of mostly generic configuration  options, documented [here].

In addition to the above table configuration the table creation  UI provides a set of controls, documented [here].

The table builder also allows you to manage already created elements: click on its name in the list,  use the same configuration UI documented above, and the table management controls documented [here].

There are a few other options under the `Add Ons > Elastic Sheets` menu:

<<pic>>

* "Launch Elasticsearch Table Builder" is discussed above.
* "Configure Elasticsearch" defines the connection to the source cluster, documented [here].
* "View range's lookup table" allows users to build JSON objects out of cell ranges, which can then be used as lookup tables. This is documented [here].
* "Refresh active table" triggers a reload from source for the selected table. Trigger options are documented [here].
