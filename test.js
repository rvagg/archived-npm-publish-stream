const test = require('tap').test
    , http = require('http')
    , EE   = require('events').EventEmitter
    , NpmPublishStream = require('./')

    , PORT = 2345

function registryFaker (responses) {
  var ee = new EE()
    , i  = 0
    , server = http.createServer(function (req, res) {
        ee.emit('connect', req.url)
        res.setHeader('content-type', 'application/json')
        res.writeHead(200)
        if (responses[i])
          res.write(JSON.stringify(responses[i++]))
        res.end()
        if (i >= responses.length) {
          server.close(ee.emit.bind(ee, 'end'))
        }
      }).listen(PORT, ee.emit.bind(ee, 'ready'))

  return ee
}

test('simple single scan', function (t) {
  t.plan(3) // 2 data events, 1 connect

  var expected = [
          { id: 'foojs', key: new Date(Date.now() - 1000) }
        , { id: 'barjs', key: new Date() }
      ]

    , ee = registryFaker([ { rows: expected } ])

  ee.on('end', t.end.bind(t))
  ee.on('connect', function (url) {
    var time = JSON.stringify(new Date()).replace(/\d{2}\.\d{3}/, '\\d{2}\.\\d{3}')
    t.like(url, new RegExp('/registry/_design/app/_view/updated\\?include_docs=true\\&startkey=' + time))
  })
  ee.once('ready', function () {
    var nps = new NpmPublishStream({ hostname: 'localhost', port: PORT })
      , i   = 0

    nps.on('error', t.fail.bind(t))
    nps.on('data', function (actual) {
      t.deepEquals(expected[i++], actual, 'data point ' + (i-1) + ' is correct')
    })
    ee.on('end', nps.destroy.bind(nps))
  })
})

test('simple double scan, same data', function (t) {
  t.plan(4) // 2 data events, 2 connect

  var expected = [
          { id: 'foojs', key: new Date(Date.now() - 1000) }
        , { id: 'barjs', key: new Date() }
      ]

    , ee = registryFaker([ { rows: expected }, { rows: expected } ])

  ee.on('end', t.end.bind(t))
  ee.on('connect', function (url) {
    var time = JSON.stringify(new Date()).replace(/\d{2}\.\d{3}/, '\\d{2}\.\\d{3}')
    t.like(url, new RegExp('/registry/_design/app/_view/updated\\?include_docs=true\\&startkey=' + time))
  })
  ee.once('ready', function () {
    var nps = new NpmPublishStream({ hostname: 'localhost', port: PORT, refreshRate: 100 })
      , i   = 0

    nps.on('error', t.fail.bind(t))
    nps.on('data', function (actual) {
      t.deepEquals(expected[i++], actual, 'data point ' + (i-1) + ' is correct')
    })
    ee.on('end', nps.destroy.bind(nps))
  })
})

test('simple multi scan, overlapping & new data', function (t) {
  t.plan(8) // 5 data events, 3 connect

  var expected = [
          [   { id: 'foojs', key: new Date(Date.now() - 1000 * 60 * 60 * 5) }
            , { id: 'barjs', key: new Date(Date.now() - 1000 * 60 * 60 * 4) } ]
        , [   { id: 'barjs', key: new Date(Date.now() - 1000 * 60 * 60 * 4) }
            , { id: 'bangjs', key: new Date(Date.now() - 1000 * 60 * 60 * 3) } ]
        , [   { id: 'boomjs', key: new Date(Date.now() - 1000 * 60 * 60 * 2) }
            , { id: 'whoajs', key: new Date(Date.now() - 1000 * 60 * 60 * 1) } ]
      ]
    , uniques = [ expected[0][0], expected[0][1], expected[1][1], expected[2][0], expected[2][1] ]
    , ee = registryFaker(expected.map(function (e) { return { rows: e } }))
    , i  = 0
    , c  = 0

  ee.on('end', t.end.bind(t))
  ee.on('connect', function (url) {
    var time = JSON.stringify(c === 0 ? expected[0][0].key : expected[c - 1][1].key)
    t.equal(url, '/registry/_design/app/_view/updated?include_docs=true&startkey=' + time)
    c++
  })
  ee.once('ready', function () {
    var nps = new NpmPublishStream({
            hostname    : 'localhost'
          , port        : PORT
          , refreshRate : 100
          , startTime   : expected[0][0].key
        })

    nps.on('error', t.fail.bind(t))
    nps.on('data', function (actual) {
      t.deepEquals(uniques[i++], actual, 'data point ' + (i - 1) + ' is correct')
    })
    ee.on('end', nps.destroy.bind(nps))
  })
})
