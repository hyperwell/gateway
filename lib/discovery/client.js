const uuid = require('uuid')
const {createClientSwarm} = require('hyperswarm-ws')
const {AbstractSwarm} = require('../abstract-swarm')
const {DiscoveryStream} = require('./stream')
const {gatewayUrls} = require('../ws')
const debug = require('debug')('me2u:discovery')

const uniqueValues = array =>
  array.reduce((x, y) => (x.includes(y) ? x : [...x, y]), [])

class DiscoverySwarm extends AbstractSwarm {
  announcements = new Map()

  constructor(target) {
    super({
      topic: target,
      lookup: true,
      announce: false,
    })

    this.id = uuid()
    this.target = target
  }

  async _createSwarm(topic, _, joinOpts) {
    const swarm = await createClientSwarm(gatewayUrls)
    swarm.on('error', err => this.emit('error', err))

    super._createSwarm(topic, swarm, joinOpts)
    debug(`joining discovery swarm ${this.topic.toString('hex')} (client)`)
  }

  _createStream() {
    const stream = new DiscoveryStream(this.id, null)
    stream.on('announce', this._handleAnnounce)
    stream.on('unannounce', this._handleUnannounce)

    return stream
  }

  _handleAnnounce = ({id, url}) => {
    debug(`received announcement for ${url}`)
    this.announcements.set(id, url)
    this.emit('announce', url)
  }

  _handleUnannounce = ({id, url}) => {
    debug(`received unannounce for ${url}`)
    this.announcements.delete(id)
    this.emit('unannounce', url)
  }

  get uniqueAnnouncements() {
    return uniqueValues(Array.from(this.announcements.values()))
  }
}

module.exports = {DiscoverySwarm}
