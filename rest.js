/**
 * @see https://github.com/muka/titanium-rest-client
 */

var getPromise = function() {

   /**
    * Promise implementation based on promiz
    * https://github.com/zolmeister/promiz
    * MIT Licensed
    * Copyright (c) 2014 Zolmeister
    */

  return (function () {

    var queueId = 1
    var queue = {}
    var isRunningTask = false

    function nextTick(fn) {
      setTimeout(fn, 0)
    }

    Deferred.resolve = function (value) {
      if (!(this._d == 1))
        throw TypeError()

      if (value instanceof Deferred)
        return value

      return new Deferred(function (resolve) {
          resolve(value)
      })
    }

    Deferred.reject = function (value) {
      if (!(this._d == 1))
        throw TypeError()

      return new Deferred(function (resolve, reject) {
          reject(value)
      })
    }

    Deferred.all = function (arr) {
      if (!(this._d == 1))
        throw TypeError()

      if (!(arr instanceof Array))
        return Deferred.reject(TypeError())

      var d = new Deferred()

      function done(e, v) {
        if (v)
          return d.resolve(v)

        if (e)
          return d.reject(e)

        var unresolved = arr.reduce(function (cnt, v) {
          if (v && v.then)
            return cnt + 1
          return cnt
        }, 0)

        if(unresolved == 0)
          d.resolve(arr)

        arr.map(function (v, i) {
          if (v && v.then)
            v.then(function (r) {
              arr[i] = r
              done()
              return r
            }, done)
        })
      }

      done()

      return d
    }

    Deferred.race = function (arr) {
      if (!(this._d == 1))
        throw TypeError()

      if (!(arr instanceof Array))
        return Deferred.reject(TypeError())

      if (arr.length == 0)
        return new Deferred()

      var d = new Deferred()

      function done(e, v) {
        if (v)
          return d.resolve(v)

        if (e)
          return d.reject(e)

        var unresolved = arr.reduce(function (cnt, v) {
          if (v && v.then)
            return cnt + 1
          return cnt
        }, 0)

        if(unresolved == 0)
          d.resolve(arr)

        arr.map(function (v, i) {
          if (v && v.then)
            v.then(function (r) {
              done(null, r)
            }, done)
        })
      }

      done()

      return d
    }

    Deferred._d = 1


    /**
     * @constructor
     */
    function Deferred(resolver) {
      'use strict'
      if (typeof resolver != 'function' && resolver != undefined)
        throw TypeError()

      if (typeof this != 'object' || (this && this.then))
        throw TypeError()

      // states
      // 0: pending
      // 1: resolving
      // 2: rejecting
      // 3: resolved
      // 4: rejected
      var self = this,
        state = 0,
        val = 0,
        next = [],
        fn, er;

      self['promise'] = self

      self['resolve'] = function (v) {
        fn = self.fn
        er = self.er
        if (!state) {
          val = v
          state = 1

          nextTick(fire)
        }
        return self
      }

      self['reject'] = function (v) {
        fn = self.fn
        er = self.er
        if (!state) {
          val = v
          state = 2

          nextTick(fire)

        }
        return self
      }

      self['_d'] = 1

      self['then'] = function (_fn, _er) {
        if (!(this._d == 1))
          throw TypeError()

        var d = new Deferred()

        d.fn = _fn
        d.er = _er
        if (state == 3) {
          d.resolve(val)
        }
        else if (state == 4) {
          d.reject(val)
        }
        else {
          next.push(d)
        }

        return d
      }

      self['catch'] = function (_er) {
        return self['then'](null, _er)
      }

      var finish = function (type) {
        state = type || 4
        next.map(function (p) {
          state == 3 && p.resolve(val) || p.reject(val)
        })
      }

      try {
        if (typeof resolver == 'function')
          resolver(self['resolve'], self['reject'])
      } catch (e) {
        self['reject'](e)
      }

      return self

      // ref : reference to 'then' function
      // cb, ec, cn : successCallback, failureCallback, notThennableCallback
      function thennable (ref, cb, ec, cn) {
        if ((typeof val == 'object' || typeof val == 'function') && typeof ref == 'function') {
          try {

            // cnt protects against abuse calls from spec checker
            var cnt = 0
            ref.call(val, function (v) {
              if (cnt++) return
              val = v
              cb()
            }, function (v) {
              if (cnt++) return
              val = v
              ec()
            })
          } catch (e) {
            val = e
            ec()
          }
        } else {
          cn()
        }
      };

      function fire() {

        // check if it's a thenable
        var ref;
        try {
          ref = val && val.then
        } catch (e) {
          val = e
          state = 2
          return fire()
        }

        thennable(ref, function () {
          state = 1
          fire()
        }, function () {
          state = 2
          fire()
        }, function () {
          try {
            if (state == 1 && typeof fn == 'function') {
              val = fn(val)
            }

            else if (state == 2 && typeof er == 'function') {
              val = er(val)
              state = 1
            }
          } catch (e) {
            val = e
            return finish()
          }

          if (val == self) {
            val = TypeError()
            finish()
          } else thennable(ref, function () {
              finish(3)
            }, finish, function () {
              finish(state == 1 && 3)
            })

        })
      }


    }
    return Deferred
  })()

}

var Client = function(params) {

  params = params || {}
  var lib = {}
  var me = this

  this.Promise = params.Promise || getPromise()

  this.logger = params.logger || {
    debug: console.debug,
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }

  var basicAuthBeforeRequest = function(options) {

    if(!options.basicAuth) {
      return
    }

    var authstr = options.basicAuth

    if(typeof authstr === "function") {
      authstr = authstr()
    }

    if(!authstr) return

    if(authstr.username) {
      authstr = Ti.Utils.base64encode(authstr.username+":"+authstr.password)
    }

    options.headers['authorization'] = 'Basic ' + authstr
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
      me.logger.debug('Skip oAuth token')
      return fn && fn()
    }

    token(function(accessToken) {
      if(accessToken) {
        me.logger.debug('Add oAuth token')
        options.headers['authorization'] = accessToken.toString()
      }
      me.logger.debug('Empty oAuth token?')
      fn && fn()
    })

  }

  var request = lib.request = function(options) {

    options = options || {}
    options = _.extend({}, params, options)

    options.headers = options.headers || {}
    options.oauth2 = options.oauth2 === undefined ? params.oauth2 : options.oauth2

    var completed = function(err, res) {
      options.completed && options.completed(err, res);
    }

    var getresult = function(client, err, errRaw) {
      return {
        data: client.responseText,
        status: client.status,
        statusText: client.statusText,
        error: err ? err : false,
        getError: function() {
          return errRaw
        },
        getHeader: function(k) {
          return client.getResponseHeader(k)
        },
        getClient: function() {
          return client
        },
      };
    }

    return new me.Promise(function(resolve, reject) {

      var client = Ti.Network.createHTTPClient({
        // function called when the response data is available
        onload : function(e) {
          me.logger.debug('Request loaded')
          var result = getresult(client);
          options.success && options.success(result);
          resolve(result)
          completed(null, result);
        },
        // function called when an error occurs, including a timeout
        onerror : function(e) {
          me.logger.debug('Request error')
          var error = getresult(client, e.error, e);
          options.error && options.error(error)
          reject(error)
          completed(error, null)
        },
        validatesSecureCertificate: options.validateCert || false,
        timeout : options.timeout || 5000,
      })

      if(options.beforeRequest) {
        me.logger.debug('Call beforeRequest callback')
        options.beforeRequest(options)
      }

      me.logger.debug("Requesting "+ options.method +" "+ options.url);
      client.open(options.method.toUpperCase(), options.url);

      me.logger.debug('Check if json request')
      jsonBeforeRequest(options)

      me.logger.debug('Check for basic auth')
      basicAuthBeforeRequest(options)

      var performRequest = function() {

        me.logger.debug('Set headers')
        if(options.headers) {
          for(var key in options.headers) {
            client.setRequestHeader(key, options.headers[key])
          }
        }

        if(options.onRequest) {
          me.logger.debug('Call onRequest callback')
          options.onRequest(xhr, options)
        }

        me.logger.debug('Send request')
        client.send(options.data);
      }

      // retrieve token if needed
      me.logger.debug('Check oauth token')
      oAuth2BeforeRequest(options, performRequest)
    })
  }

  var wrap = function(method, url, data, fn, options) {

    options = options || {}

    options.completed = fn;

    if(typeof fn === 'object') {
      options = fn;
      options.completed = null;
    }

    if(typeof data === 'function') {
      options.completed = data;
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
    return request(wrap('POST', url, data, fn, options))
  }

  lib.put = function(url, data, fn, options) {
      return request(wrap('PUT', url, data, fn, options))
  }

  lib.request = request
  lib.Promise = this.Promise

  return lib
}

module.exports = new Client()
module.exports.Client = Client
