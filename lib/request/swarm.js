const Hyperswarm = require('hyperswarm')
const {AbstractRequestSwarm} = require('./abstract-swarm')

class RequestSwarm extends AbstractRequestSwarm {
  constructor(docUrl, opts) {
    super(docUrl, () => Hyperswarm(), opts)
  }
}

module.exports = {RequestSwarm}
