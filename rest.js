/**
  var options = {
    method: "POST",
    url: "http://example.com",
    data: "{}",
    headers: { "Authorization": "Bearer abc" }
    validateCert: true|false,
    completed: function(err, res) {}
    success: function(res) {}
    error: function(err) {}
  }
*/

var Client = function(params) {

  params = params || {}
  var lib = {}
  var me = this

  this.logger = params.logger || {
    debug: console.debug,
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }

  var basicAuthBeforeRequest = function(options) {
    if(!options.basicAuth) return

    var authstr = options.basicAuth
    if(options.basicAuth.username) {
      authstr = options.basicAuth.username+":"+options.basicAuth.password
    }

    options.headers['Authorization'] = 'Basic ' + Ti.Utils.base64encode(authstr)
  }

  var jsonBeforeRequest = function(options) {

    if(!options.json) return

    me.logger.debug('JSON request')
    var srcCallback = options.completed || null
    options.completed = function(err, res) {
      if(res && res.data) {
        try {
          res.text = res.data
          res.json = res.data = JSON.parse(res.text)
        }
        catch(e) {
          res.json = res.data = null
          err = new Error("Cannot parse json")
        }
      }
      srcCallback && srcCallback(err, res);
    }

    // set header
    options.headers['content-type'] = "application/json"
    // stringify body
    if(typeof options.data === 'object' || options.data instanceof Array) {
      options.data = JSON.stringify(options.data);
    }

  }

  var oAuth2BeforeRequest = function(options, fn) {

    var token = options.oauth2

    if(!token || typeof token !== 'function') {
      return fn && fn()
    }

    token(function(accessToken) {
      if(accessToken) {
        me.logger.debug('Add oAuth token')
        options.headers['authorization'] = accessToken.toString()
      }
      me.logger.debug('Empty oAuth token?')
      return fn && fn()
    })

  }

  var request = lib.request = function(options) {

    options = options || {}
    options.headers = options.headers || {}

    var completed = function(err, res) {
      options.completed && options.completed(err, res);
    }

    var getresult = function(client, err, raw) {
      return {
        data: client.responseText,
        status: client.status,
        statusText: client.statusText,
        error: err ? err : false,
        raw: raw,
      };
    }

    var client = Ti.Network.createHTTPClient({
      // function called when the response data is available
      onload : function(e) {
        me.logger.debug('Request loaded')
        var result = getresult(client);
        completed(null, result);
        options.success && options.success(result);
      },
      // function called when an error occurs, including a timeout
      onerror : function(e) {
        me.logger.debug('Request error')
        var error = getresult(client, e.error, e);
        completed(error, null)
        options.error && options.error(error)
      },
      validatesSecureCertificate: options.validateCert || false,
      timeout : options.timeout || 5000,
    })

    // Prepare the connection.
    me.logger.debug('Open client')
    client.open(options.method.toUpperCase(), options.url);

    me.logger.debug('Check if json request')
    jsonBeforeRequest(options)

    me.logger.debug('Check for basic auth')
    basicAuthBeforeRequest(options)

    var performRequest = function() {

      me.logger.debug('Call beforeRequest callback')
      options.beforeRequest && options.beforeRequest(options)

      me.logger.debug('Set headers')
      if(options.headers) {
        for(var key in options.headers) {
          client.setRequestHeader(key, options.headers[key])
        }
      }

      me.logger.debug('Send request')
      client.send(options.data);
    }

    // retrieve token if needed
    me.logger.debug('Check oauth token')
    oAuth2BeforeRequest(options, performRequest)

    return client;
  }

  var wrap = function(method, url, data, fn, options) {

    options = options || {}

    if(typeof fn === 'object') {
      options = fn;
    }

    if(typeof fn === 'function') {
      options.completed = fn;
    }

    options.method = method
    options.url = url
    if(data) options.data = data

    return options;
  }

  lib.get = function(url, fn, options) {
    return request(wrap('GET', url, null, fn, options))
  }

  lib.delete = function(url, fn, options) {
    return request(wrap('DELETE', url, null, fn, options))
  }

  lib.head = function(url, fn, options) {
    return request(wrap('HEAD', url, null, fn, options))
  }

  lib.post = function(url, data, fn, options) {
    return request(wrap('POST', data, null, fn, options))
  }

  lib.put = function(url, data, fn, options) {
      return request(wrap('PUT', data, null, fn, options))
  }

  lib.request = request

  return lib
}

module.exports = new Client()
module.exports.Client = Client
