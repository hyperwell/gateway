const pathMatch = require('path-match')
const {ProtocolSwarm} = require('../protocol-swarm')
const {ResponseStream} = require('./stream')
const {RequestMethod} = require('../messages')
const debug = require('debug')('me2u-response-swarm')

const requestMethods = Object.keys(RequestMethod).map(method =>
  method.toLowerCase()
)

const routeMatcher = pathMatch({
  sensitive: true,
  strict: false,
  end: false,
})

class Swarm extends ProtocolSwarm {
  handlers = []

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

    for (const method of requestMethods) {
      stream.on(method, ({path, data}) =>
        this._handleRequest(stream, method, path, data)
      )
    }

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
}

module.exports = {ResponseSwarm: Swarm}
