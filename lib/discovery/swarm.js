const Hyperswarm = require('hyperswarm')
const {EventEmitter} = require('events')
const pump = require('pump')
const crypto = require('crypto')
const uuid = require('uuid/v1')
const {DiscoveryStream} = require('./stream')
const debug = require('debug')('fm2u-discovery')

const uniqueValues = array =>
  array.reduce((x, y) => (x.includes(y) ? x : [...x, y]), [])

class DiscoverySwarm extends EventEmitter {
  swarm = null
  streams = new Map()
  announcements = new Map()

  constructor(target, url) {
    super()

    this.id = uuid()
    this.url = url
    this.target = target

    this._createSwarm()
  }

  _createSwarm() {
    this.swarm = Hyperswarm()
    const topic = crypto
      .createHash('sha256')
      .update(this.target)
      .digest()

    this.swarm.on('connection', this._handleConnection)

    this.swarm.join(topic, {
      lookup: true,
      announce: true,
    })
  }

  _handleConnection = socket => {
    const stream = this._createStream()
    stream.announce()

    pump(socket, stream, socket)
  }

  _createStream() {
    const id = uuid()
    const stream = new DiscoveryStream(this.id, this.url)

    stream.on('announce', this._handleAnnounce)
    stream.on('unannounce', this._handleUnannounce)
    stream.once('close', () => this._handleStreamEnd(id))

    this.streams.set(id, stream)

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

  _handleStreamEnd = streamId => {
    this.streams.delete(streamId)
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
    return new Promise(resolve => this.swarm.destroy(resolve))
  }
}

module.exports = {DiscoverySwarm}
