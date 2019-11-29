#!/usr/bin/env node
const parseArgs = require('minimist')
const {createServer} = require('../lib/server')
const HyperwellSwarm = require('../lib/swarm')

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ['port', 'hostname'],
    boolean: ['ssl'],
    alias: {
      port: ['p'],
      ssl: ['s'],
    },
    default: {
      port: '3000',
      hostname: 'localhost',
      ssl: false,
    },
  })

  await createServer(new HyperwellSwarm(), Number.parseInt(argv.port), {
    ssl: argv.ssl,
    hostname: argv.hostname,
  })
}

main()
