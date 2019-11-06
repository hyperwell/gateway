const uuid = require('uuid/v1')
const {ProtocolSwarm} = require('../protocol-swarm')
const {DiscoveryStream} = require('./stream')
const debug = require('debug')('me2u:discovery')

const uniqueValues = array =>
  array.reduce((x, y) => (x.includes(y) ? x : [...x, y]), [])

class DiscoverySwarm extends ProtocolSwarm {
  announcements = new Map()

  constructor(target, url) {
    super({
      topic: target,
      lookup: true,
      announce: true,
    })
    debug(`joining discovery swarm ${this.topic.toString('hex')}`)

    this.id = uuid()
    this.url = url
    this.target = target
  }

  _createStream() {
    const stream = new DiscoveryStream(this.id, this.url)

    stream.on('announce', this._handleAnnounce)
    stream.on('unannounce', this._handleUnannounce)
    stream.announce()

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

  unannounce() {
    for (const stream of this.streams.values()) {
      stream.unannounce()
    }
  }

  async destroy() {
    this.unannounce()
    return await super.destroy()
  }
}

module.exports = {DiscoverySwarm}
