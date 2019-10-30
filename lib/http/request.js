/**
 *  An approach for doing manual HTTP request/response parsing, influenced
 *  by Node's `_http_server.js` setup.
 * - <https://stackoverflow.com/a/22485718>
 * - <https://programmer.help/blogs/node.js-source-parsing-http-request-response-process.html>
 * - <https://github.com/nodejs/node/blob/master/lib/_http_server.js>
 */
const {HTTPParser, parsers} = require('_http_common')
const {ServerResponse} = require('_http_server')
const events = require('events')

const keepAliveTimeout = 5000

class HTTPServerAsyncResource {
  constructor(type, socket) {
    this.type = type
    this.socket = socket
  }
}

function freeParser(parser) {
  if (parser) {
    parser.onIncoming = null
    parser.socket = null
    parsers.free(parser)
    parser = null
  }
}

function parseRequest(socket) {
  const emitter = new events.EventEmitter()
  const parser = parsers.alloc()

  parser.initialize(
    HTTPParser.REQUEST,
    new HTTPServerAsyncResource('HTTPINCOMINGMESSAGE', socket)
  )
  parser.socket = socket
  parser.maxHeaderPairs = 2000
  socket.parser = parser

  parser.onIncoming = (req, keepAlive) => {
    emitter.emit('request', req, createResponse(socket, req, keepAlive))
  }

  socket.on('data', buffer => {
    var ret = parser.execute(buffer, 0, buffer.length)
    if (ret instanceof Error) {
      emitter.emit('error')

      freeParser(parser)
    }
  })

  socket.once('close', () => {
    freeParser(parser)
  })

  return emitter
}

function createResponse(socket, req, keepAlive = false) {
  const res = new ServerResponse(req)
  res.shouldKeepAlive = keepAlive
  res.assignSocket(socket)

  // When we're finished writing the response, check if this is the last
  // response, if so destroy the socket.
  res.on('finish', resOnFinish.bind(undefined, req, res, socket))

  return res
}

function createRequest(socket, url, keepAlive = false) {
  socket.write(`GET ${url} HTTP/1.0
Connection: ${keepAlive ? 'keep-alive' : 'close'}

`)

  return new Promise(resolve => {
    let resolved = false

    socket.once('data', data => {
      console.log('Received ' + data.length + ' bytes\n' + data)

      // TODO parse response, close just after content-length bytes
      if (keepAlive) {
        resolved = true
        resolve()
      }
    })

    socket.on('end', () => {
      if (!resolved) {
        resolve()
      }
    })
  })
}

function resOnFinish(req, res, socket) {
  // If the user never called req.read(), and didn't pipe() or
  // .resume() or .on('data'), then we call req._dump() so that the
  // bytes will be pulled off the wire.
  if (!req._consuming && !req._readableState.resumeScheduled) req._dump()

  res.detachSocket(socket)
  req.emit('close')
  process.nextTick(() => res.emit('close'), res)

  // TODO improve outgoing responses state queue
  if (res._last && !res.shouldKeepAlive) {
    if (typeof socket.destroySoon === 'function') {
      socket.destroySoon()
    } else {
      socket.end()
    }
  } else if (typeof socket.setTimeout === 'function') {
    socket.setTimeout(keepAliveTimeout)
  }
}

module.exports = {parseRequest, createRequest}
