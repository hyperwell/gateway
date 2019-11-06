const assert = require('assert')
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

  async getAnnotations() {
    return await this.createRequest('get', '/annotations.jsonld')
  }

  async getAnnotation(id) {
    return await this.createRequest('get', `/annotations/${id}.jsonld`)
  }

  async createAnnotation(annotation) {
    console.log(await this.createRequest('post', '/annotations/', annotation))
    return annotation
  }

  async updateAnnotation(annotation) {
    assert.fail('Not implemented yet')
  }
}

module.exports = {RequestSwarm}
