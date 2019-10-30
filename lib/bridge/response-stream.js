const {Duplex} = require('stream')
const {
  ResponseEvent,
  ResponseCode,
  RequestEvent,
  RequestMethod,
} = require('../messages')

class ResponseStream extends Duplex {
  constructor() {
    super()
    this.setMaxListeners(256)
  }

  respond(code, path, data) {
    const responseData =
      data && typeof data === 'object' ? JSON.stringify(data) : ''

    this._sendMessage(code, path, responseData)
  }

  _sendMessage(code, path, data = null) {
    this.push(
      ResponseEvent.encode({
        code: ResponseCode[code],
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
          this.emit(name.toLowerCase(), decoded)
        }
      }
      callback()
    } catch (e) {
      callback(e)
    }
  }

  _read() {}
}

module.exports = {ResponseStream}
