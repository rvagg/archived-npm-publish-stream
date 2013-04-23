const NpmPublishStream = require('./')
    , colorsTmpl = require('colors-tmpl') // you'll need to npm install colors-tmpl

    , outf = colorsTmpl('{green}{bold}%s{/bold}@%s{/green} <{yellow}http://npm.im/%s{/yellow}>: %s')
    , desclength = 70

function shorten (s) {
  return s.length <= desclength ? s : s.substring(0, desclength) + '...'
}

new NpmPublishStream({ startTime: new Date(Date.now() - 1000 * 60 * 60 * 1)})
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