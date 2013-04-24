const http           = require('http')
    , ReadableStream = require('readable-stream').Readable
    , extend         = require('util')._extend
    , inherits       = require('util').inherits

function fetch (options, callback) {
  var opt = {
          hostname : options.hostname || 'isaacs.iriscouch.com'
        , path     : '/registry/_design/app/_view/updated?include_docs=true&startkey='
            + JSON.stringify(options.startTime)
        , port     : options.port || 80
      }

  http.get(
      opt
    , function(res) {
        var content = ''

        if (res.statusCode != 200) {
          callback(new Error('Got status code ' + res.statusCode))
          return callback = null
        }

        res.setEncoding('utf8')

        res
          .on('data', function (chunk) {
            content += chunk
          })
          .on('error', function (err) {
            callback(err)
            callback = null
          })
          .on('end', function () {
            try {
              callback && callback(null, JSON.parse(content))
            } catch (ex) {
              callback(new Error('error parsing response data', ex))
            }
          })
      }
  )
}

function NpmPublishStream (options) {
  ReadableStream.call(this, { objectMode: true })
  this._options = extend({
      refreshRate : 1000 * 30
    , startTime   : new Date()
  }, options || {})
  this._lastRefreshTime = this._options.startTime
  this._lastRefreshBatch = []
}

inherits(NpmPublishStream, ReadableStream)

NpmPublishStream.prototype._read = function () {
  if (!this._refreshInterval) {
    this._refreshInterval = setInterval(
        this._refreshFromRepository.bind(this)
      , this._options.refreshRate
    )
    this._refreshFromRepository()
  }
}

NpmPublishStream.prototype._refreshFromRepository = function() {
  if (this._refreshing)
    return

  this._refreshing = true
  var opt = extend(extend({}, this._options), { startTime: this._lastRefreshTime })
  fetch(opt, function (err, data) {
    if (err) return this.emit('error', err)
    var batch = []
      , id

    data.rows.forEach(function (row) {
      batch.push(id = (row.id + '|' + row.key))
      row.key = new Date(row.key)
      if (this._lastRefreshBatch.indexOf(id) == -1) {
        this.push(row)
      } // else we've seen this before
    }.bind(this))
    this._lastRefreshBatch = batch
    if (data.rows.length)
      this._lastRefreshTime = data.rows[data.rows.length - 1].key
    this._refreshing = false
  }.bind(this))
}

NpmPublishStream.prototype.destroy = function() {
  clearInterval(this._refreshInterval)
  this._refreshInterval = -1
  this.emit('end')
}

module.exports = NpmPublishStream