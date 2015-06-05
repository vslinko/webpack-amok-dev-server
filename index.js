var amok = require('amok')
var MemoryFileSystem = require('memory-fs')
var express = require('express')
var proxy = require('express-http-proxy')
var path = require('path')

function WebpackAmokDevServer(compiler, config) {
  this._compiler = compiler
  this._config = config
  this._runned = false
}

WebpackAmokDevServer.prototype.listen = function(port, host, callback) {
  if (!callback) {
    callback = host
    host = '0.0.0.0'
  }
  if (!callback) {
    callback = function() {}
  }

  if (this._runned) {
    callback(new Error('WebpackAmokDevServer already started'))
    return
  }

  this._host = host || '0.0.0.0'
  this._port = port || '8080'
  this._runned = true

  Promise.resolve(this._runWebServer())
    .then(this._runWebpack.bind(this))
    .then(this._runAmok.bind(this))
    .then(function() {
      callback()
    }, function(error) {
      console.error(error)
      callback(error)
    })
}

WebpackAmokDevServer.prototype._runAmok = function() {
  var that = this

  var listener

  var debugPort = that._config.debugPort || 9222
  var debugHost = that._config.debugHost || 'localhost'

  var host = that._host === '0.0.0.0' ? 'localhost' : that._host
  var port = that._port
  var url = 'http://' + host + ':' + port + '/'

  this._onChange = function(changed) {
    if (listener) {
      listener(changed)
    }
  }

  amok.set('cwd', that._config.cwd)
  amok.set('url', url)
  amok.use(amok.browser('chrome', [], process.stdout))
  amok.use(amok.print(process.stdout))

  amok.use(function(inspector, runner, done) {
    listener = function(changed) {
      inspector.getScripts(function(scripts) {
        changed.forEach(function(change) {
          var filename = change.file.replace(new RegExp('^' + that._config.cwd + '/'), '')

          var script = scripts
            .filter(function(script) {
              if (!script.url) {
                return false
              }

              return script.url.replace(url, '') === filename
            })
            .shift()

          if (!script) {
            return
          }

          inspector.setScriptSource(script, change.source, function(error) {
            if (error) {
              console.error(error.description)
              return
            }

            var expr = 'var e = new CustomEvent("patch");\nwindow.dispatchEvent(e);'

            inspector.evaluate(expr, function(error) {
              if (error) {
                console.error('error %s', error.description)
              }
            })
          })
        })
      })
    }

    done()
  })

  return new Promise(function(resolve, reject) {
    amok.connect(debugPort, debugHost, function(error) {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

WebpackAmokDevServer.prototype._runWebpack = function() {
  var that = this

  var first = true
  var callback

  that._compiler.outputFileSystem = new MemoryFileSystem()

  that._compiler.watch(200, function(error, stats) {
    var notify = !first
    var changed

    if (first) {
      first = false
      callback()
    }

    if (error) {
      console.error(error)
      return
    }

    // console.log(stats.toString())

    if (notify) {
      changed = Object.keys(stats.compilation.assets)
        .map(function(key) {
          return stats.compilation.assets[key]
        })
        .filter(function(asset) {
          return asset.emitted
        })
        .map(function(asset) {
          return {
            file: asset.existsAt,
            source: asset._cachedSource,
          }
        })

      that._onChange(changed)
    }
  })

  return new Promise(function(resolve) {
    callback = resolve
  })
}

WebpackAmokDevServer.prototype._runWebServer = function() {
  var that = this

  that._app = express()

  that._app.get(path.join(that._config.publicPath, that._config.filename), function(req, res) {
    var filename = path.join(that._config.cwd, that._config.publicPath, that._config.filename)
    var source = that._compiler.outputFileSystem.readFileSync(filename).toString()

    res.setHeader('Content-Type', 'application/javascript')
    res.send(source)
  })

  if (that._config.proxy) {
    Object.keys(that._config.proxy).forEach(function(pattern) {
      var target = that._config.proxy[pattern]

      that._app.all(pattern, proxy(target))
    })
  }

  return new Promise(function(resolve, reject) {
    that._app.listen(that._port, that._host, function(error) {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

module.exports = WebpackAmokDevServer
