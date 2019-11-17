const Hyperswarm = require('hyperswarm')
const {AbstractSwarm} = require('./abstract-swarm')

const MAX_PEERS = 1001

class ProtocolSwarm extends AbstractSwarm {
  constructor(opts) {
    super({
      ...opts,
      swarm: Hyperswarm({
        maxPeers: MAX_PEERS,
        announceLocalAddress: process.env.NODE_ENV !== 'production',
      }),
    })
  }
}

module.exports = {ProtocolSwarm}
