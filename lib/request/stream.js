const {Duplex} = require('stream')
const {
  RequestEvent,
  RequestMethod,
  ResponseEvent,
  ResponseCode,
} = require('../messages')

class Stream extends Duplex {
  constructor() {
    super()
    this.setMaxListeners(256)
  }

  request(method, id, path, data) {
    const requestData =
      typeof data === 'object' ? Buffer.from(JSON.stringify(data)) : null

    this._sendMessage(method, id, path, requestData)
  }

  _sendMessage(method, id, path, data = null) {
    this.push(
      RequestEvent.encode({
        method: RequestMethod[method],
        id,
        path,
        data,
      })
    )
  }

  _write(chunk, encoding, callback) {
    try {
      const decoded = ResponseEvent.decode(chunk)
      for (let name of Object.keys(ResponseCode)) {
        if (ResponseCode[name] === decoded.code) {
          this.emit('response', decoded)
        }
      }
      callback()
    } catch (e) {
      callback(e)
    }
  }

  _read() {}
}

module.exports = {RequestStream: Stream}
