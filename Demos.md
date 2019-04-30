This page contains some gifs demonstrating some of the key features of the tool.

* [Demo A](Demos.md#demo-a)
   * I create a Data Table for one of my indices  and discover it has hundreds of columns. I use the `Data Explorer`
   Map/Reduce template to build a summary of the data and then the Google Sheets filter to filter out boring fields.
   Finally I paste the filtered column into the Table's `Fields` selector and refresh, to make the table useful.
* [Demo B](Demos.md#demo-b)
   * I create a Data Table for a different index, and notice it has medium-sized arrays of (~30) complex objects.
   I use the custom function `buildEsSubTable` to turn one of the nested arrays into a table of its own.
* [Demo C](Demos.md#demo-c)
   * The index from `Demo A` contains lineup statistics from basketball games. I use [SQL](https://www.elastic.co/products/stack/elasticsearch-sql) to generate some simple
     aggregations grouped by the lineup. I want to filter the statistics to be over only a certain class of opponent,
     but that's ~30 teams so cumbersome to type by hand. So I build another `GROUP BY` SQL table just listing the teams,
     use an adjacent column to specify the opponent class, turn that into a SQL query with [Google Sheets' `CONCATENATE`
     , `TEXTJOIN`, and `FILTER` functions](https://support.google.com/docs/table/25273?hl=en&ref_topic=9054531), and then inject that query into the Table.
* [Demo D](Demos.md#demo-d)
   * There's a lot happening here, so I've split it into 3 parts:
   * [Part 1](Demos.md#part-1)
      * I duplicate `Demo C` but using a combination of standard [Elasticsearch aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html) (`terms` grouping, `sum` metric)
      and Map/Reduce (a UI over the top of `scripted_metric`)
   * [Part 2](Demos.md#part-2)
      * The reason for using a more complex Map/Reduce in `Part 1` was to be able to adjust the statistics based on
      the strength of opponent. So I first use a Data Table on the advanced statistics index (from `Demo B`) to
      list last year's opponents' strength. Then I use [`VLOOKUP`](https://support.google.com/docs/answer/3093318?hl=en) on the teams actually faced (from `Demo C`) to check
      the 2 data sources match (they don't for a couple of teams, so I fix that). This allows me to build a lookup table
      for the offensive and defensive strength of each opponent.
   * [Part 3](Demos.md#part-3)
      * Now I edit the Aggregation Table from `Part 1` to add the lookup table, and then change the Map/Reduce job to incorporate it.
* [Demo E](Demos.md#demo-e)
   * A common Spreadsheet construct is the [pivot table](https://en.wikipedia.org/wiki/Pivot_table). In this demo I create a composite aggregation with 2 bucket fields then show how easy it is to build a 2d pivot table from that aggregation, using the [built-in Sheets functionality](https://support.google.com/docs/answer/1272900?co=GENIE.Platform%3DDesktop&hl=en&oco=1).
* [Demo F](Demos.md#demo-f)
   * In this simple demo, I add a pagination feature to the table from `Demo D` so that I can scroll through the data.       

# Demo A

_I create a query for one of my tables and discover it has hundreds of columns. I use the `Data Explorer`
Map/Reduce template to build a summary of the data and then the Google Sheets filter to filter out boring fields.
Finally I paste the filtered column into the Table's `Fields` filter and refresh, to make the table useful._

![elastic-sheets-demo-A](https://user-images.githubusercontent.com/17573856/55519962-203ccb80-5648-11e9-9d64-2a573d00544b.gif)

# Demo B

_I create a Data Table for a different index, and notice it has medium-sized arrays of (~30) complex objects.
I use the custom function `buildEsSubTable` to turn one the nested arrays into a table of its own._

![elastic-sheets-demo-B](https://user-images.githubusercontent.com/17573856/55519966-2468e900-5648-11e9-9c86-d80a22ced698.gif)

# Demo C

_The first index contains lineup statistics from basketball games. I use [SQL](https://www.elastic.co/products/stack/elasticsearch-sql) to generate some simple
     aggregations grouped by the lineup. I want to filter the statistics to be over only a certain class of opponent,
     but that's ~30 teams so cumbersome to type by hand. So I build another `GROUP BY` SQL table just listing the teams,
     use an adjacent column to specify the opponent class, turn that into a SQL query with [Google Sheets' `CONCATENATE`
     , `TEXTJOIN`, and `FILTER` functions](https://support.google.com/docs/table/25273?hl=en&ref_topic=9054531), and then inject that query into the Table._

![elastic-sheets-demo-C](https://user-images.githubusercontent.com/17573856/55519972-29c63380-5648-11e9-997f-110075eb31ce.gif)

# Demo D

## Part 1

_I duplicate `Demo C` but using a combination of standard [Elasticsearch aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html) (`terms` grouping, `sum` metric)
      and Map/Reduce (a UI over the top of `scripted_metric`)._

![elastic-sheets-demo-Da](https://user-images.githubusercontent.com/17573856/55519979-2f237e00-5648-11e9-91df-9210eb8533c3.gif)

## Part 2

_The reason for using a more complex Map/Reduce in `Part 1` was to be able to adjust the statistics based on
      the strength of opponent. So I first use a Data Table on the advanced statistics index (from `Demo B`) to
      list last year's opponents' strength. Then I use [`VLOOKUP`](https://support.google.com/docs/answer/3093318?hl=en) on the teams actually faced (from `Demo C`) to check
      the 2 data sources match (they don't for a couple of teams, so I fix that). This allows me to build a lookup table
      for the offensive and defensive strength of each opponent._

![elastic-sheets-demo-Db](https://user-images.githubusercontent.com/17573856/55519985-33e83200-5648-11e9-89ca-d98275e2fc26.gif)

## Part 3

_Now I edit the Aggregation Table from `Part 1` to add the lookup table, and then change the Map/Reduce job to
        incorporate it._

![elastic-sheets-demo-Dc](https://user-images.githubusercontent.com/17573856/55519990-38ace600-5648-11e9-9185-466d1baf872f.gif)

# Demo E

_A common Spreadsheet construct is the [pivot table](https://en.wikipedia.org/wiki/Pivot_table). In this demo I create a composite aggregation with 2 bucket fields then show how easy it is to build a 2d pivot table from that aggregation, using the [built-in Sheets functionality](https://support.google.com/docs/answer/1272900?co=GENIE.Platform%3DDesktop&hl=en&oco=1)._

![elastic-sheets-demo-E](https://user-images.githubusercontent.com/19776583/56977981-77996300-6b44-11e9-88d9-d876dbd0d85a.gif)

# Demo F

_In this simple demo, I add a pagination feature to the table from `Demo D` so that I can scroll through the data._

![elastic-sheets-demo-F](https://user-images.githubusercontent.com/17573856/55519995-3d719a00-5648-11e9-8410-d6b0e97ae993.gif)
