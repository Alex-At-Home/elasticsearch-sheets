#!/bin/bash
if [ $# -ne 1 ]; then
   echo "build-elastic-sheets-project <dir>"
   exit -1
fi
if [ ! -d "$1" ]; then
   echo "dir ./$1 does not exist"
   exit -1
fi
cd $1 
#clasp create elasticSheetsProjects
#clasp create elasticSheetsShare
rm -f *.js *.gs *.html
cp ../appsscript.json .
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
