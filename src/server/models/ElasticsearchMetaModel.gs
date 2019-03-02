/** Holds the defaults for (+ illustration of) the ES metadata model returned by the management service */
var esMetaModel_ = {
   "url": "",
   "version": "", //(optional)
   "username": "",
   "password": "", //(will not normally be populated)
   "auth_type": "", //"anonymous", "password", in the future: "token", "saml", "oauth" etc
   "password_global": false, // false if stored locally (ie only accessible for given user)
   "header_json": {}, //key, value map
   "client_options_json": {}, //(passed directly to ES client)
   "enabled": true,
   "query_trigger": "none", //"none", "timed", "popup", "timed_or_popup"
   "query_trigger_interval_s": 2
}
