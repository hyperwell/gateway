const assert = require('assert')
const {Duplex} = require('stream')
const {EventEmitter} = require('events')
const lps = require('length-prefixed-stream')
const crypto = require('crypto')
const pump = require('pump')
const uuid = require('uuid/v1')

class AbstractSwarm extends EventEmitter {
  swarm = null
  streams = new Map()

  constructor({topic, createSwarm, lookup = true, announce = true}) {
    super()
    this._createSwarm(topic, createSwarm, {lookup, announce})
  }

  _createSwarm(topic, createSwarm, joinOpts) {
    assert(
      typeof createSwarm === 'function',
      '`createSwarm` is expected to be a function'
    )
    this.topic = crypto
      .createHash('sha256')
      .update(topic)
      .digest()

    this.swarm = createSwarm()
    this.swarm.on('connection', this._handleConnection)

    this.swarm.join(this.topic, joinOpts)
  }

  _handleConnection = async socket => {
    const stream = this._setupStream()
    pump(socket, lps.decode(), stream, lps.encode(), socket)
  }

  _setupStream() {
    const id = uuid()
    const stream = this._createStream()
    assert(stream instanceof Duplex)

    stream.once('close', () => this._handleStreamEnd(id))

    this.streams.set(id, stream)
    return stream
  }

  _createStream() {
    throw new Error('`_createStream` needs to be implemented')
  }

  _handleStreamEnd = streamId => {
    this.streams.delete(streamId)
  }

  async destroy() {
    for (const stream of this.streams.values()) {
      stream.destroy()
    }
    return new Promise(resolve => this.swarm.destroy(resolve))
  }
}

module.exports = {AbstractSwarm}