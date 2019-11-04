const {createBrowserSwarm} = require('hyperswarm-ws')
const {AbstractRequestSwarm} = require('./abstract-swarm')

const gatewayUrls = ['wss://hyperswarm-ws-gateway.kassel.works']

async function createRequestSwarm() {
  const browserSwarm = await createBrowserSwarm(gatewayUrls)

  return class RequestSwarm extends AbstractRequestSwarm {
    constructor(docUrl, opts) {
      super(docUrl, () => browserSwarm, opts)
    }
  }
}

module.exports = {createRequestSwarm}
