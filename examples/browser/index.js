const {RequestSwarm} = require('from-me-to-you/browser')

const docUrl = window.location.hash.substr(1)
console.log(`joining request swarm with doc url: ${docUrl}`)

new RequestSwarm(docUrl, {
  onConnection: async createRequest => {
    console.log(await createRequest('GET', '/annotations.jsonld'))
    console.log(await createRequest('GET', '/related.json'))
  },
})
