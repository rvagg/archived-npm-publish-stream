# NpmPublishStream [![Build Status](https://secure.travis-ci.org/rvagg/node-npm-publish-stream.png)](http://travis-ci.org/rvagg/node-npm-publish-stream)

A Node.js [ReadableStream](http://nodejs.org/docs/latest/api/stream.html#stream_class_stream_readable) that emits data for each module published to npm, in near-realtime.

**NpmPublishStream** uses simple polling against the npm registry server to fetch data about publish events

## Example

```js
const NpmPublishStream = require('npm-publish-stream')
    , colorsTmpl = require('colors-tmpl')

    , outf = colorsTmpl('{green}{bold}%s{/bold}@%s{/green} <{yellow}http://npm.im/%s{/yellow}>: %s')
    , desclength = 70

function shorten (s) {
  return s.length <= desclength ? s : s.substring(0, desclength) + '...'
}

new NpmPublishStream()
  .on('data', function (data) {
    console.log(
        outf
      , data.id
      , data.doc['dist-tags'].latest
      , data.id
      , shorten(data.doc.description || '')
    )
  })
  .on('error', console.log)
```

And we get an endless stream of npm published packages:

![Example](http://js.vagg.org/github/npm-publish-stream-example.png?)

## API

There is only a constructor that makes a *object* stream. The constructor can take an options object though, the following properties are accepted::

 * <b><code>'startTime'</code></b>: a `Date` object specifying when you would like the stream to start from, this would normally be at some point in the past although not too far back unless you want to be flooded with data.
 * <b><code>'refreshRate'</code></b>: an integer specifying the length in milliseconds between each refresh from the npm registry. This is the polling-frequency and you can increase or decrease it from the default `30000` (30s).
 * <b><code>'hostname'</code></b>: a `string` if you wish to specify a different registry other than the global npm registry.
 * <b><code>'port'</code></b>: an integer if you wish to specify a different registry other than the global npm registry.

*Inspired by [@bcoe](https://github.com/bcoe)'s [npm-tweets](https://github.com/bcoe/npm-tweets/) which runs on [Twitter](https://twitter.com/nodenpm).*

## Licence

Super Simple Blog Loader for Node.js is Copyright (c) 2013 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.
