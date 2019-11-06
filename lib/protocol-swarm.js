const Hyperswarm = require('hyperswarm')
const {AbstractSwarm} = require('./abstract-swarm')

class ProtocolSwarm extends AbstractSwarm {
  constructor(opts) {
    super({
      ...opts,
      swarm: Hyperswarm(),
    })
  }
}

module.exports = {ProtocolSwarm}
