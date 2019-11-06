const assert = require('assert')
const {parse: parseUrl} = require('url')
const {createBrowserSwarm} = require('hyperswarm-ws')
const {AbstractRequestSwarm} = require('./abstract-swarm')

const gatewayUrls = ['wss://hyperswarm-ws-gateway.kassel.works']
const pathPattern = /^\/annotations\/(\w+)\.jsonld$/
const getAnnotationId = url => {
  const {pathname} = parseUrl(url)
  const results = pathname.match(pathPattern)
  return results.length > 1 ? results[1] : null
}

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
    const {location} = await this.createRequest(
      'post',
      '/annotations/',
      annotation
    )
    return {
      ...annotation,
      id: `${this.docUrl}${location}`,
    }
  }

  async updateAnnotation(annotation) {
    const id = getAnnotationId(annotation.id)
    return await this.createRequest(
      'put',
      `/annotations/${id}.jsonld`,
      annotation
    )
  }
}

module.exports = {RequestSwarm}
