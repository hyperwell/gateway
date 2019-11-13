const {createClientSwarm} = require('hyperswarm-ws')
const {AbstractRequestSwarm} = require('./abstract-swarm')

const gatewayUrls = ['wss://hyperswarm-ws-gateway.kassel.works']

class RequestSwarm extends AbstractRequestSwarm {
  constructor(docUrl, opts) {
    super(docUrl, null, opts)
  }

  async _createSwarm(topic, _, joinOpts) {
    const swarm = await createClientSwarm(gatewayUrls)
    swarm.on('error', err => this.emit('error', err))

    super._createSwarm(topic, swarm, joinOpts)
  }
}

module.exports = {RequestSwarm}
