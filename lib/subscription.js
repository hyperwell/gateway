const crypto = require('crypto')
const EventEmitter = require('events')
const Cache = require('node-cache')
const uuid = require('uuid/v1')
const debug = require('debug')('hyperwell:gateway:subscription')

const hashAnnotation = annotation =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(annotation))
    .digest()

class Subscription extends EventEmitter {
  constructor() {
    super()
    this.id = uuid()
    this.cache = new Cache()
  }

  init(annotations) {
    debug(`initializing subscription ${this.id}`)
    this.cache.mset(
      annotations.reduce(
        (pairs, annotation) => [
          ...pairs,
          {
            key: annotation.id,
            val: {
              hash: hashAnnotation(annotation),
              annotation,
            },
          },
        ],
        []
      )
    )
  }

  diff(annotations) {
    const inserted = []
    const changed = []
    const deleted = []

    const ids = annotations.map(({id}) => id)
    for (const id of this.cache.keys()) {
      if (!ids.includes(id)) {
        deleted.push(this.cache.get(id).annotation)
        this.cache.del(id)
      }
    }

    for (const annotation of annotations) {
      const hash = hashAnnotation(annotation)
      if (!this.cache.has(annotation.id)) {
        inserted.push(annotation)
        this.cache.set(annotation.id, {hash, annotation})
      } else {
        if (!this.cache.get(annotation.id).hash.equals(hash)) {
          changed.push(annotation)
          this.cache.set(annotation.id, {hash, annotation})
        }
      }
    }

    return {inserted, changed, deleted}
  }

  close() {
    debug(`closing subscription ${this.id}`)
    this.emit('close')
    this.removeAllListeners()
    this.cache.close()
  }
}

module.exports = Subscription
