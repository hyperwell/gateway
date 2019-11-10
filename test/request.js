const tape = require('tape')
const test = require('tape-promise').default(tape)
const {fixture, initPeer} = require('./util')

const {parseId} = require('../lib/annotation/meta')
const {RequestSwarm} = require('../lib/request/swarm')

test('creating and getting a single annotation via request-swarm', async function(t) {
  const url = await initPeer(test)
  const client = new RequestSwarm(url)
  const createdAnnotation = await client.createAnnotation(fixture)

  const {annotationId} = parseId(createdAnnotation.id)
  t.deepEqual(
    createdAnnotation,
    await client.getAnnotation(annotationId),
    'check annotation distribution API equality'
  )

  await client.destroy()
})

test('updating an annotation via request-swarm', async function(t) {
  const url = await initPeer(test)
  const client = new RequestSwarm(url)

  await client.createAnnotation(fixture)
  const createdAnnotation = await client.createAnnotation(fixture)

  const {annotationId} = parseId(createdAnnotation.id)
  const updatedAnnotation = {
    ...createdAnnotation,
    body: {
      foo: 'bar',
    },
  }

  await client.updateAnnotation(updatedAnnotation)
  t.deepEqual(
    updatedAnnotation,
    await client.getAnnotation(annotationId),
    'check annotation distribution equality'
  )

  await client.destroy()
})

test('getting all annotations via request-swarm', async function(t) {
  const url = await initPeer(test)
  const client = new RequestSwarm(url)
  const annotations = [
    await client.createAnnotation(fixture),
    await client.createAnnotation(fixture),
  ]

  t.deepEqual(
    annotations,
    await client.getAnnotations(),
    'check annotation distribution API equality'
  )

  await client.destroy()
})

test('deleting an annotations via request-swarm', async function(t) {
  const url = await initPeer(test)
  const client = new RequestSwarm(url)
  const firstAnnotation = await client.createAnnotation(fixture)
  const {id} = await client.createAnnotation(fixture)
  const {annotationId} = parseId(id)

  await client.deleteAnnotation(annotationId)
  t.deepEqual(
    [firstAnnotation],
    await client.getAnnotations(),
    'check annotation distribution API equality'
  )

  await client.destroy()
})
