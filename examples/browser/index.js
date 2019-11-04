require('core-js/stable')
require('regenerator-runtime/runtime')
const {createRequestSwarm} = require('from-me-to-you/browser')

async function main() {
  const docUrl = window.location.hash.substr(1)
  console.log(`joining request swarm with doc url: ${docUrl}`)

  const RequestSwarm = await createRequestSwarm()

  new RequestSwarm(docUrl, {
    onConnection: async createRequest => {
      console.log(await createRequest('GET', '/annotations.jsonld'))
      console.log(await createRequest('GET', '/related.json'))
    },
  })
}

main()
