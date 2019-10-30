#!/usr/bin/env node
const Hyperswarm = require('hyperswarm')
const crypto = require('crypto')
const {createRequest} = require('../lib/http-request')
const {createStore} = require('../lib/repo-store')

async function main() {
  const repoStore = await createStore()
  const docUrl = repoStore.repos[0].docs[0]

  const swarm = Hyperswarm()

  const topic = crypto
    .createHash('sha256')
    .update(`annotations-${docUrl}`)
    .digest()
  console.log(`joining second swarm: ${topic.toString('hex')}`)

  swarm.join(topic, {
    lookup: true,
    announce: false,
  })

  await new Promise(resolve => {
    swarm.once('connection', async socket => {
      console.log('new connection')
      await createRequest(socket, `/annotations.jsonld`, true)
      await createRequest(socket, `/related.json`)
      resolve()
    })
  })

  console.log('Leaving swarm...')
  swarm.destroy()
}

main()
