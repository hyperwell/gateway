const {AbstractSwarm} = require('../abstract-swarm')
const {RequestStream} = require('./stream')
const {ResponseCode} = require('../messages')
const debug = require('debug')('me2u-request-swarm')

const requestTypeMapping = {
  GET: 'OK',
  POST: 'CREATED',
  PUT: 'UPDATED',
  DELETE: 'DELETED',
}

const responseCodes = Object.keys(ResponseCode).map(code => code.toLowerCase())

class AbstractRequestSwarm extends AbstractSwarm {
  constructor(docUrl, createSwarm, opts = {}) {
    super({
      topic: `annotations-${docUrl}`,
      createSwarm,
      lookup: true,
      announce: false,
    })
    debug(`joining distribution swarm: ${this.topic.toString('hex')} (client)`)

    this.onConnection = opts.onConnection
  }

  _createStream() {
    const stream = new RequestStream()

    if (typeof this.onConnection === 'function') {
      this.onConnection(this.createRequest(stream))
    }

    return stream
  }

  createRequest(stream) {
    return async (method, path, data) =>
      new Promise((resolve, reject) => {
        debug(`${method} ${path}`)

        const otherCodes = [...responseCodes]
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
}

module.exports = {AbstractRequestSwarm}
