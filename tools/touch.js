const {Repo} = require('hypermerge')
const Hyperswarm = require('hyperswarm')
const {encodeDocUrl} = require('../lib/util')

const repo = new Repo({memory: true})
repo.setSwarm(Hyperswarm(), {
  lookup: false,
  announce: true,
})

const url = repo.create({annotations: []})
const handle = repo.watch(url, () => {})

console.log(`New notebook created.
Document URL: ${url}
Encoded URL: ${encodeDocUrl(url)}`)

process.on('SIGINT', () => handle.close())
