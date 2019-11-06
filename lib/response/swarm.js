const pathMatch = require('path-match')
const {ProtocolSwarm} = require('../protocol-swarm')
const {ResponseStream} = require('./stream')
const {RequestMethod} = require('../messages')
const debug = require('debug')('me2u:response-swarm')

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
    stream.on('request', ({method, path, data}) =>
      this._handleRequest(stream, method, path, data)
    )

    return stream
  }

  _handleRequest = async (stream, reqMethod, path, data) => {
    try {
      data = data.length > 0 ? JSON.parse(Buffer.from(data).toString()) : null
    } catch (err) {
      stream.respond('BAD_REQUEST', path, null)
    }

    for (const {method, matchUrl, handler} of this.handlers) {
      const params = matchUrl(path)
      if (
        reqMethod === RequestMethod[method.toUpperCase()] &&
        params !== false
      ) {
        debug(method, path, params)
        try {
          const res = await handler(reqMethod, path, params, data)

          if (!res) {
            stream.respond('OK', path, null)
          } else {
            const code = res.code || 'OK'
            const data = res.data || null

            stream.respond(code, path, data)
          }
        } catch (err) {
          debug(`> BAD ERROR during ${reqMethod} ${path}:`, err)
          stream.respond('INTERNAL_ERROR', path, null)
        }
        return
      }
    }

    stream.respond('NOT_FOUND', path, null)
  }
}

module.exports = {ResponseSwarm: Swarm}
