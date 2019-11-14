const {Duplex} = require('stream')
const {
  ResponseEvent,
  ResponseCode,
  RequestEvent,
  RequestMethod,
} = require('../messages')
const debug = require('debug')('me2u:response-stream')

class Stream extends Duplex {
  constructor() {
    super()
    this.setMaxListeners(256)
  }

  respond(code, id, path, data = null) {
    const responseData =
      data && typeof data === 'object'
        ? Buffer.from(JSON.stringify(data))
        : null

    this._sendMessage(code, id, path, responseData)
  }

  _sendMessage(code, id, path, data = null) {
    debug(code, id.toString(), path, data ? '<data>' : '')
    this.push(
      ResponseEvent.encode({
        code: ResponseCode[code],
        id,
        path,
        data,
      })
    )
  }

  _write(chunk, encoding, callback) {
    try {
      const decoded = RequestEvent.decode(chunk)

      for (let name of Object.keys(RequestMethod)) {
        if (RequestMethod[name] === decoded.method) {
          this.emit('request', decoded)
        }
      }
      callback()
    } catch (e) {
      callback(e)
    }
  }

  _read() {}
}

module.exports = {ResponseStream: Stream}
