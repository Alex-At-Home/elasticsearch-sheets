/**
 ** Painless langage constructs
 */
var PainlessInfo = {
  scriptMetricContext: [
    "params",
    "params._name_",
    "params._source",
    "_score",
    "state",
    "states",
    "doc"
  ],
  scriptFieldContext: [
    "params",
    "params._source",
    "doc",
    "_value"
  ],
  keywords: [
    "if", "else", "while", "do", "for",
    "in", "continue", "break", "return", "new",
    "try", "catch", "throw", "this", "instanceof",

    "byte", "short", "char", "int", "long", "float", "double",
    "boolean", "def", "Object", "String", "void"
  ]
}
