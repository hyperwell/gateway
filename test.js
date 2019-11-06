const test = require('tape')
const {parseId} = require('./lib/annotation/meta')

const docKey = 'FHLQ1NF8HE8YdhdSEVjyUGeUcRk9SEshvac3M3jQRvZU'
const urlFixtures = [
  [`hypermerge:/${docKey}/annotations/bar.jsonld`, docKey, 'bar'],
  [`hypermerge:/${docKey}/annotations/foo.jsonld`, docKey, 'foo'],
  [`hypermerge:/annotations/bar.json`, false],
  [`hypermergefoo:/${docKey}/annotations/bar.jsonld`, false],
  [`hypermerge:/annotations/bar.jsonld`, false],
  ['/annotations/foo.jsonld', null, 'foo'],
]

test('getAnnotationId', function(t) {
  t.plan(urlFixtures.length)
  for (const [url, ...args] of urlFixtures) {
    const expected =
      args.length === 1 && args[0] === false
        ? null
        : {docId: args[0], annotationId: args[1]}
    t.deepEqual(parseId(url), expected)
  }
})
