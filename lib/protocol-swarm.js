const Hyperswarm = require('hyperswarm')
const {AbstractSwarm} = require('./abstract-swarm')

class ProtocolSwarm extends AbstractSwarm {
  constructor(opts) {
    super({
      ...opts,
      createSwarm: () => Hyperswarm(),
    })
  }
}

module.exports = {ProtocolSwarm}
