const Hyperswarm = require('hyperswarm')
const {EventEmitter} = require('events')
const pump = require('pump')
const crypto = require('crypto')
const pathMatch = require('path-match')
const uuid = require('uuid/v1')
const lps = require('length-prefixed-stream')
const {ResponseStream} = require('./response-stream')
const {RequestMethod} = require('../messages')
const debug = require('debug')('fm2u-response-swarm')

const requestMethods = Object.keys(RequestMethod).map(method =>
  method.toLowerCase()
)

const routeMatcher = pathMatch({
  sensitive: true,
  strict: false,
  end: false,
})

class ResponseSwarm extends EventEmitter {
  swarm = null
  streams = new Map()
  handlers = []

  constructor(id) {
    super()

    this.id = id
    this._createSwarm()
  }

  _createSwarm() {
    const topic = crypto
      .createHash('sha256')
      .update(this.id)
      .digest()

    debug(`joining distribution swarm ${topic.toString('hex')} (server)`)
    this.swarm = Hyperswarm()
    this.swarm.on('connection', this._handleConnection)

    this.swarm.join(topic, {
      lookup: false,
      announce: true,
    })
  }

  setHandler(method, pattern, handler) {
    this.handlers.push({
      method: method.toLowerCase(),
      matchUrl: routeMatcher(pattern),
      handler,
    })
  }

  _handleConnection = socket => {
    const stream = this._createStream()
    pump(socket, lps.decode(), stream, lps.encode(), socket)
  }

  _createStream() {
    const id = uuid()
    const stream = new ResponseStream()
    this.streams.set(id, stream)

    for (const method of requestMethods) {
      stream.on(method, ({path, data}) =>
        this._handleRequest(stream, method, path, data)
      )
    }
    stream.once('close', () => this._handleStreamEnd(id))

    return stream
  }

  _handleRequest = async (stream, reqMethod, path, data) => {
    for (const {method, matchUrl, handler} of this.handlers) {
      const params = matchUrl(path)

      if (reqMethod === method && params !== false) {
        const res = await handler(reqMethod, path, params, data)

        if (!res) {
          stream.respond('OK', path, null)
        } else {
          const code = res.code || 'OK'
          const data = res.data || null

          stream.respond(code, path, data)
        }
        return
      }
    }

    stream.respond('NOT_FOUND', path, null)
  }

  _handleStreamEnd = streamId => {
    this.streams.delete(streamId)
  }

  async destroy() {
    return new Promise(resolve => this.swarm.destroy(resolve))
  }
}

module.exports = {ResponseSwarm}
