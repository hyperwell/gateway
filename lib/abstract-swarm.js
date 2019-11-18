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

  constructor({topic, swarm, lookup = true, announce = true, handleError}) {
    super()
    this.setMaxListeners(256)

    if (typeof handleError === 'function') {
      this.on('error', handleError)
    }
    this._createSwarm(topic, swarm, {lookup, announce})
  }

  _createSwarm(topic, swarm, joinOpts) {
    assert(swarm, '`opts.swarm` needs to be supplied to AbstractSwarm')

    this.topic = crypto
      .createHash('sha256')
      .update(topic)
      .digest()
    this.swarm = swarm
    this.swarm.on('connection', (socket, info) =>
      this._handleConnection(socket, info)
    )
    this.swarm.join(this.topic, joinOpts)

    this.emit('ready')
  }

  _handleConnection(socket) {
    const stream = this._setupStream()
    pump(socket, lps.decode(), stream, lps.encode(), socket)

    return stream
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
    assert.fail('`swarm._createStream` needs to be implemented')
  }

  _handleStreamEnd(streamId) {
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
