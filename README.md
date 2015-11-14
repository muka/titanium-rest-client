Titanium HTTP REST client
===

Yet another HTTP client wrapper lib


Usage
---

```
var client = require('rest')

client.post("http://example.com", { data }, function(err, res) {

  if(err) return console.error(err)

  console.log(res)

}, { json: true })
```

Response
---

```
{
  data: "request response"
  status: "<status code>",
  statusText: "<status text>",
  error: "string error message or false",
  raw: "raw error message",
}
```

Methods
---

`rest.get("url", function(err, res), options)`

`rest.post("url", data, function(err, res), options)`

`rest.delete("url", function(err, res), options)`

`rest.put("url", data, function(err, res), options)`

`rest.head("url", function(err, res), options)`

```
rest.request({
  method: "POST",
  data: "payload data",
  headers: { // custom request headers
    "x-custom": "header val"
  },

  // allow untrusted certificates, like self-signed
  validateCert: false,

  // callback
  completed: function(err, res) {}

  // optional parameters

  // called on success only
  success: function(res) {}
  // called on error only
  error: function(err) {}

  json: true, // handle json request/response. result.data will contain a json object

  // use basic authentication
  basicAuth: { // can be a string like user:pass
    username: "user",
    password: "pass"
  },

  // use oauth2 Bearer token. Must be a callback
  oauth2: function(then) {
    // retrieve an accessToken and continue with request
    // var accessToken = ...
    // continue with request calling callback
    then(accessToken)
  }

})
```

Customize defaults
---

var Client = require('rest').Client

var client = new Client({
  // default to json req/res
  json: true,
  oauth2: function(then) {
    getToken(function(accessToken) {
      then(accessToken)
    })
  },
  error: function(err) {
    console.warn("Request failed:", err.status, err.statusText)
  }
})


License
---
MIT
