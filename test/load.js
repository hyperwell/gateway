const tape = require('tape')
const test = require('tape-promise').default(tape)

const {parseId} = require('../lib/annotation/meta')
const {createStore} = require('../lib/repo-store')
const {distributeDocs} = require('../lib/distribution')
const {RequestSwarm} = require('../lib/request/swarm')

const wait = duration => new Promise(resolve => setTimeout(resolve, duration))
const amount = 100
const fixture = {
  '@context': 'http://www.w3.org/ns/anno.jsonld',
  type: 'Annotation',
  body: {
    type: 'TextualBody',
    value: 'Comment text',
    format: 'text/plain',
  },
  target: 'http://example.org/target1',
}

const initPeer = async () => {
  const repoStore = await createStore({volatile: true})
  const {id, repo} = await repoStore.addRepo()
  const url = repo.create({annotations: []})
  await repoStore.addDoc(id, url)

  const closeDistribution = distributeDocs(id, repo, repoStore)

  const handleFinish = async () => {
    await closeDistribution()
    await repoStore.destroy()
  }
  test.onFinish(handleFinish)
  test.onFailure(handleFinish)

  return url
}

// TODO: test also via websocket, and especially the websocket gateway

test('creating and getting a single annotation via request-swarm', async function(t) {
  const url = await initPeer()
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
  const url = await initPeer()
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
  const url = await initPeer()
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
  const url = await initPeer()
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

test(`testing client node with ${amount} serial client requests`, async function(t) {
  t.plan(amount)
  const url = await initPeer()

  const initialClient = new RequestSwarm(url)
  const createdAnnotation = await initialClient.createAnnotation(fixture)
  const {annotationId} = parseId(createdAnnotation.id)
  await initialClient.destroy()

  for (let i = 0; i < amount; i++) {
    const client = new RequestSwarm(url)
    t.deepEqual(
      createdAnnotation,
      await client.getAnnotation(annotationId),
      'check annotation distribution API equality'
    )
    await client.destroy()
    await wait(10)
  }
})

test(`testing client node with ${amount} parallel client requests`, async function(t) {
  t.timeoutAfter(15000)
  t.plan(amount)
  const url = await initPeer()

  const initialClient = new RequestSwarm(url)
  const createdAnnotation = await initialClient.createAnnotation(fixture)
  const {annotationId} = parseId(createdAnnotation.id)
  await initialClient.destroy()

  const requests = []

  for (let i = 0; i < amount; i++) {
    const client = new RequestSwarm(url)
    requests.push({client, request: client.getAnnotation(annotationId)})
  }

  const results = await Promise.all(requests.map(({request}) => request))
  for (let j = 0; j < amount; j++) {
    t.deepEqual(
      createdAnnotation,
      results[j],
      'check annotation distribution API equality'
    )
    await requests[j].client.destroy()
  }
})
