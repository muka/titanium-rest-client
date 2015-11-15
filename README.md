Titanium HTTP REST client
===

Yet another titanium HTTP client


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

Response object returned by the request. This apply to `error` and `result`.
On successful request `error` and `raw` will be a falsy value

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

Available methods

`rest.get("url", function(err, res), options)`

`rest.post("url", data, function(err, res), options)`

`rest.delete("url", function(err, res), options)`

`rest.put("url", data, function(err, res), options)`

`rest.head("url", function(err, res), options)`

`rest.request(options)`

Options
---

`options` can be any of the following:

```
rest.request({
  url: "https://example.com",
  method: "POST",
  data: "payload data",
  headers: { // custom request headers
    "x-custom": "header val"
  },

  // allow untrusted certificates, like self-signed
  validateCert: false,

  // optional parameters

  // called on success only
  success: function(res) {}

  // called on error only
  error: function(err) {}

  // always callsed after completion
  completed: function(err, res) {}

  json: true, // handle json request/response. result.data will contain a json object

  // use basic authentication
  basicAuth: {
    username: "user",
    password: "pass"
  },
  // or a string base64 encoded
  basicAuth: Ti.Utils.base64encode("user:pass"),

  // or function returning an object or string like above
  basicAuth: function() { return Ti.Utils.base64encode("user:pass") },

  // use oauth2 Bearer token. Must be a callback
  oauth2: function(then) {
    // retrieve an accessToken and continue with request
    // var accessToken = ...
    // continue with request calling callback
    then(accessToken)
  },

  // a Promise spec implementation alternative to the integrated one
  // Promise: require('bluebird'),

  // A logger implementation. Expect a console like interface (eg. debug, log, info, warn, error)
  logger: console,

})
```

Promise support
---

Request will return Promise, based on `zolmeister/promiz` implementation by Zolmeister

An alternative Promise implementation can be provided with `options.Promise`

(Unluckly Promises will make debugging near to impossible)

```
client.get("http://example.com")
  .then(function(res) {
    console.log("Success!", res)
    return client.Promise.resolve(res.data === 42)
  })
  .then(function(correct) {
    correct && console.info("correct question")
  })
  .catch(function(err) {
    console.error(err)
  })
```

Customize defaults
---

Create a custom instance of the client to set defaults for every request

```
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
```

License
---
The MIT License

Copyright (c) 2015 Luca Capra <luca.capra@gmail.com>
