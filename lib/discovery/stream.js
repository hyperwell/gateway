const {Duplex} = require('stream')
const {DiscoveryEvent, EventType} = require('./messages')

class DiscoveryStream extends Duplex {
  constructor(id, url) {
    super()
    this.id = Buffer.from(id)
    this.url = url
    this.setMaxListeners(256)
  }

  announce() {
    this._sendMessage('ANNOUNCE')
  }

  unannounce() {
    this._sendMessage('UNANNOUNCE')
  }

  _sendMessage(type) {
    this.push(
      DiscoveryEvent.encode({
        type: EventType[type],
        id: this.id,
        url: this.url,
      })
    )
  }

  _write(chunk, encoding, callback) {
    try {
      const decoded = DiscoveryEvent.decode(chunk)

      for (let name of Object.keys(EventType)) {
        if (EventType[name] === decoded.type) {
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

module.exports = {DiscoveryStream}
