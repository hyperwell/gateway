const {createBrowserSwarm} = require('hyperswarm-ws')
const {AbstractRequestSwarm} = require('./abstract-swarm')

const gatewayUrls = ['wss://hyperswarm-ws-gateway.kassel.works']

class RequestSwarm extends AbstractRequestSwarm {
  constructor(docUrl, opts) {
    super(docUrl, null, opts)
  }

  async _createSwarm(topic, _, joinOpts) {
    super._createSwarm(topic, await createBrowserSwarm(gatewayUrls), joinOpts)
  }
}

module.exports = {RequestSwarm}
