const tape = require('tape')
const test = require('tape-promise').default(tape)
const {fixture, wait, initPeer, waitOnReady} = require('./util')

const {parseId} = require('../lib/annotation/meta')
const {RequestSwarm} = require('../lib/request/swarm')
const {
  RequestSwarm: BrowserRequestSwarm,
} = require('../lib/request/browser-swarm')

const amount = 100

// TODO: test also via websocket, and especially the websocket gateway

test(`testing client node with ${amount} serial client requests over websockets`, async function(t) {
  t.plan(amount)
  const url = await initPeer(test)

  const initialClient = new BrowserRequestSwarm(url)
  await waitOnReady(initialClient)
  const createdAnnotation = await initialClient.createAnnotation(fixture)
  const {annotationId} = parseId(createdAnnotation.id)
  await initialClient.destroy()

  for (let i = 0; i < amount; i++) {
    const swarm = new BrowserRequestSwarm(url)
    await waitOnReady(swarm)

    t.deepEqual(
      createdAnnotation,
      await swarm.getAnnotation(annotationId),
      'check annotation distribution API equality'
    )
    await swarm.destroy()
    await wait(10)
  }
})

test(`testing client node with ${amount} serial client requests`, async function(t) {
  t.plan(amount)
  const url = await initPeer(test)

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
  const url = await initPeer(test)

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
