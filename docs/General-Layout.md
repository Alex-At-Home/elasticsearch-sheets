# General Layout

TODO pic

## Location of different table elements

This section describes the "General Layout" tab of the "Table Builder", which is common to all the table types.

Tables consist of 2 different types of cells:
* The actual data from whatever the actual table type is
  * (this includes the row of column fields, called the "Header")
* "Control data", which is one of the following:
  * The Status Bar, which describes the result of the last operation on the table
    * _(an operation can either be a manual edit of the table or a request to reload it from source)_
  * The Query Bar (data, aggregation, and SQL tables), which uses a table cell to set/augment the query
  * The Pagination Bar, which uses a table cell to control which page of data is rendered when there are more data rows

The screenshots below illustrate the different layout elements:

TODO PICS

As can be seen from the above screenshots, each of the header or control elements can be at the top or bottom of the table, and this is controlled by the dropdown menus:

TODO PIC

In addition, the status bar can be merged with either the query bar or pagination bar (it goes to the far right of the row), and this is controlled by the XXX checkbox.

##