#!/usr/bin/env node
const {RequestSwarm} = require('../lib/bridge/request-swarm')

if (process.argv.length < 3) {
  console.log('Usage: node announcement-test.js <doc-url>')
  process.exit(1)
}

async function main() {
  const docUrl = process.argv[2]
  let swarm

  await new Promise(resolve => {
    swarm = new RequestSwarm(`annotations-${docUrl}`, {
      onConnection: async createRequest => {
        console.log(await createRequest('GET', '/annotations.jsonld'))
        console.log(await createRequest('GET', '/related.json'))
        resolve()
      },
    })
  })

  if (swarm) {
    console.log('leaving swarm...')
    swarm.destroy()
  }
}

main()
