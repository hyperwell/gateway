const {BrowserSwarm} = require('hyperswarm-ws')
const {AbstractRequestSwarm} = require('./abstract-swarm')

const gatewayUrl = 'ws://localhost:4200'

class RequestSwarm extends AbstractRequestSwarm {
  constructor(docUrl, opts) {
    super(docUrl, () => new BrowserSwarm(gatewayUrl), opts)
  }
}

module.exports = {RequestSwarm}
