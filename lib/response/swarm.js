const uuid = require('uuid/v1')
const EventEmitter = require('events')
const pathMatch = require('path-match')
const {ProtocolSwarm} = require('../protocol-swarm')
const {ResponseStream} = require('./stream')
const {RequestMethod} = require('../messages')
const debug = require('debug')('me2u:response-swarm')

const routeMatcher = pathMatch({
  sensitive: true,
  strict: false,
  end: false,
})

class Swarm extends ProtocolSwarm {
  handlers = []
  subscriptions = new Map()

  constructor(id) {
    super({
      topic: id,
      lookup: false,
      announce: true,
    })
    debug(`joining distribution swarm ${this.topic.toString('hex')} (server)`)

    this.id = id
  }

  setHandler(method, pattern, handler) {
    this.handlers.push({
      method: method.toLowerCase(),
      matchUrl: routeMatcher(pattern),
      handler,
    })
  }

  _createStream() {
    const stream = new ResponseStream()
    stream.on('request', ({method, id, path, data}) =>
      this._handleRequest(stream, method, id, path, data)
    )

    return stream
  }

  _createSubscription(stream, requestId, path) {
    const emitter = new EventEmitter()
    emitter.on('pub', data => stream.respond('PUB_DATA', requestId, path, data))
    emitter.on('close', () => {
      this.subscriptions.delete(requestId)
      stream.respond('PUB_CLOSE', requestId, path)
    })
    emitter.on('error', (data = null) => {
      this.subscriptions.delete(requestId)
      stream.respond('PUB_ERROR', requestId, data)
    })

    stream.on('close', () => {
      this.subscriptions.delete(requestId)
      emitter.emit('disconnect')
    })

    this.subscriptions.set(requestId.toString(), emitter)
    return emitter
  }

  _handleRequest = async (stream, requestMethod, requestId, path, data) => {
    try {
      data = data.length > 0 ? JSON.parse(Buffer.from(data).toString()) : null
    } catch (err) {
      stream.respond('BAD_REQUEST', requestId, path)
      return
    }

    if (!path.startsWith('/')) {
      stream.respond('BAD_REQUEST', requestId, path)
      return
    }

    if (requestMethod === 6) {
      let subscriptionId
      try {
        subscriptionId = Buffer.from(data.requestId).toString()
      } catch (err) {
        stream.respond('BAD_REQUEST', requestId, path)
      }

      if (this.subscriptions.has(subscriptionId)) {
        const subscription = this.subscriptions.get(subscriptionId)
        subscription.emit('disconnect')
        stream.respond('OK', requestId, path)
      } else {
        stream.respond('NOT_FOUND', requestId, path)
      }
      return
    }

    for (const {method, matchUrl, handler} of this.handlers) {
      const params = matchUrl(path)
      if (
        requestMethod === RequestMethod[method.toUpperCase()] &&
        params !== false
      ) {
        debug(requestMethod, requestId.toString(), path, params)
        try {
          if (method.toUpperCase() === 'SUB') {
            stream.respond('PUB_INIT', requestId, path)
            const subscription = this._createSubscription(
              stream,
              requestId,
              path
            )

            try {
              await handler(requestMethod, path, params, data, subscription)
            } catch (err) {
              debug(
                `an error occured during subscription for request ${requestId.toString()}:`,
                err
              )
              subscription.emit('disconnect')
            }
          } else {
            const res = await handler(requestMethod, path, params, data)

            if (!res) {
              stream.respond('OK', requestId, path, null)
            } else {
              const code = res.code || 'OK'
              const data = res.data || null

              stream.respond(code, requestId, path, data)
            }
          }
        } catch (err) {
          debug(`> BAD ERROR during ${requestMethod} ${path}:`, err)
          stream.respond('INTERNAL_ERROR', requestId, path)
        }
        return
      }
    }

    stream.respond('NOT_FOUND', requestId, path)
  }
}

module.exports = {ResponseSwarm: Swarm}
