#!/usr/bin/env node
const {createServer} = require('../lib/server')
const HyperwellSwarm = require('../lib/swarm')

if (process.env.NODE_ENV !== 'development') {
  require('dotenv').config()
}

async function main() {
  await createServer(new HyperwellSwarm(), process.env.PORT || 3000)
}

main()
