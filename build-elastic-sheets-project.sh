#!/bin/bash
cd elastic-sheets-project
#clasp create elasticSheetsProjects
rm -f *.js *.gs *.html
for i in $(find ../src ../test/server -name "*.gs" -o -name "*.html"); do cp $i .; done
for i in $(find ../src ../test/server -name "*.js"); do
   BASENAME=$(basename $i)
   HTML_BASENAME="${BASENAME%.js}.html"
   echo "<script>" > $HTML_BASENAME
   cat $i >> $HTML_BASENAME
   echo "</script>" >> $HTML_BASENAME
done
clasp push
cd -
