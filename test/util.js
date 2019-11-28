const test = require('tape')
const {
  normalizeId,
  normalizeAnnotation,
  denormalizeAnnotation,
  encodeDocUrl,
  decodeDocUrl,
} = require('../lib/util')

const docUrl = 'foo-container'
const annotationId = '1c76c270-11fb-11ea-b65a-d9e5ad101414'
const fixture = {
  type: 'Annotation',
  body: [
    {
      type: 'TextualBody',
      value: 'foobar',
    },
  ],
  target: {
    selector: [
      {
        type: 'TextQuoteSelector',
        exact: 'baz',
      },
      {
        type: 'TextPositionSelector',
        start: 98,
        end: 104,
      },
    ],
  },
  '@context': 'http://www.w3.org/ns/anno.jsonld',
  id: `https://www.example.com/annotations/${encodeDocUrl(
    docUrl
  )}/${annotationId}`,
}

test('normalizeId', t => {
  const fixtures = [
    [
      `https://www.example.com/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
      'www.example.com',
      null,
      docUrl,
      annotationId,
    ],
    [
      `https://www.example.com/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
      'www.example2.com',
      null,
      docUrl,
      null,
    ],
    [
      `https://www.example.com/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
      'www.example.com',
      null,
      'bar-container',
      null,
    ],
    [
      `https://www.example.com:80/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
      'www.example.com',
      80,
      docUrl,
      annotationId,
    ],
    [
      `http://www.example.com:80/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
      'www.example.com',
      80,
      docUrl,
      annotationId,
      false,
    ],
    [
      `https://www.example.com:80/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
      'www.example.com',
      80,
      docUrl,
      null,
      false,
    ],
  ]
  t.plan(fixtures.length)

  for (const [id, hostname, port, docUrl, expectedId, ssl = true] of fixtures) {
    t.equal(
      normalizeId(hostname, docUrl, id, {port, ssl}),
      expectedId,
      'Annotation IDs do match'
    )
  }
})

test('normalizeAnnotation', t => {
  t.plan(1)
  const normalizedAnnotation = normalizeAnnotation(
    'www.example.com',
    docUrl,
    fixture,
    {ssl: true}
  )
  t.deepEqual(
    normalizedAnnotation,
    {
      ...fixture,
      id: annotationId,
    },
    'Normalized annotation does match'
  )
})

test('denormalizeAnnotation', t => {
  t.plan(1)
  const annotation = denormalizeAnnotation(
    'www.example.com',
    docUrl,
    {...fixture, id: annotationId},
    {ssl: true}
  )
  t.deepEqual(
    annotation,
    {
      ...fixture,
      id: `https://www.example.com/annotations/${encodeDocUrl(
        docUrl
      )}/${annotationId}`,
    },
    'Normalized annotation does match'
  )
})

test('denormalizeAnnotation')
