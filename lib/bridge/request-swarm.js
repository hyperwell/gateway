const Hyperswarm = require('hyperswarm')
const {EventEmitter} = require('events')
const pump = require('pump')
const crypto = require('crypto')
const uuid = require('uuid/v1')
const lps = require('length-prefixed-stream')
const {RequestStream} = require('./request-stream')
const {ResponseCode} = require('../messages')
const debug = require('debug')('fm2u-request-swarm')

const requestTypeMapping = {
  GET: 'OK',
  POST: 'CREATED',
  PUT: 'UPDATED',
  DELETE: 'DELETED',
}

const responseCodes = Object.keys(ResponseCode).map(code => code.toLowerCase())

class RequestSwarm extends EventEmitter {
  swarm = null
  streams = new Map()

  constructor(docUrl, opts) {
    super()

    this.docUrl = docUrl
    this.onConnection = opts.onConnection
    this._createSwarm()
  }

  _createSwarm() {
    const topic = crypto
      .createHash('sha256')
      .update(this.docUrl)
      .digest()

    debug(`joining distribution swarm ${topic.toString('hex')} (client)`)
    this.swarm = Hyperswarm()
    this.swarm.on('connection', this._handleConnection)

    this.swarm.join(topic, {
      lookup: true,
      announce: false,
    })
  }

  _handleConnection = async socket => {
    const stream = this._createStream()
    pump(socket, lps.decode(), stream, lps.encode(), socket)

    if (typeof this.onConnection === 'function') {
      await this.onConnection(this.createRequest(stream))
    }
  }

  _createStream() {
    const id = uuid()
    const stream = new RequestStream()
    this.streams.set(id, stream)

    stream.once('close', () => this._handleStreamEnd(id))

    return stream
  }

  _handleStreamEnd = streamId => {
    this.streams.delete(streamId)
  }

  createRequest(stream) {
    return async (method, path, data) =>
      new Promise((resolve, reject) => {
        debug(`${method} ${path}`)

        const otherCodes = [...Object.keys(ResponseCode)].map(code =>
          code.toLowerCase()
        )
        const goodCode = requestTypeMapping[method].toLowerCase()
        otherCodes.splice(otherCodes.indexOf(goodCode), 1)

        stream.once(goodCode, ({data}) => {
          resolve(data ? JSON.parse(Buffer.from(data)) : null)
        })

        for (const type in otherCodes) {
          stream.once(type, (code, path, data) => {
            const responseData = JSON.parse(Buffer.from(data))
            reject(
              new Error({
                message: 'unexpected responde code',
                code,
                path,
                data: responseData,
              })
            )
          })
        }

        stream.request(method, path, data)
      })
  }

  async destroy() {
    for (const stream of this.streams.values()) {
      stream.destroy()
    }
    return new Promise(resolve => this.swarm.destroy(resolve))
  }
}

module.exports = {RequestSwarm}
