const tape = require('tape')
const test = require('tape-promise').default(tape)

const {parseId} = require('../lib/annotation/meta')
const {createStore} = require('../lib/repo-store')
const {distributeDocs} = require('../lib/distribution')
const {RequestSwarm} = require('../lib/request/swarm')

const wait = duration => new Promise(resolve => setTimeout(resolve, duration))
const amount = 30
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

// TODO: test also via websocket, and especially the websocket gateway

test(`testing client node with ${amount} serial client requests`, async function(t) {
  t.plan(amount)

  const repoStore = await createStore({volatile: true})
  const {id, repo} = await repoStore.addRepo()
  const url = repo.create({annotations: []})
  await repoStore.addDoc(id, url)

  const closeDistribution = distributeDocs(id, repo, repoStore)

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

  await closeDistribution()
  await repoStore.destroy()
})

test(`testing client node with ${amount} parallel client requests`, async function(t) {
  t.plan(amount)

  const repoStore = await createStore({volatile: true})
  const {id, repo} = await repoStore.addRepo()
  const url = repo.create({annotations: []})
  await repoStore.addDoc(id, url)

  const closeDistribution = distributeDocs(id, repo, repoStore)

  const initialClient = new RequestSwarm(url)
  const createdAnnotation = await initialClient.createAnnotation(fixture)
  const {annotationId} = parseId(createdAnnotation.id)
  await initialClient.destroy()

  const requests = []

  for (let i = 0; i < amount; i++) {
    const client = new RequestSwarm(url)
    requests.push({client, request: client.getAnnotation(annotationId)})

    await wait(10)
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

  await closeDistribution()
  await repoStore.destroy()
})
