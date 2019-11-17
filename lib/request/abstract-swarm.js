const uuid = require('uuid/v1')
const EventEmitter = require('events')
const {AbstractSwarm} = require('../abstract-swarm')
const {RequestStream} = require('./stream')
const {ResponseCode} = require('../messages')
const {parseId} = require('../annotation/meta')
const debug = require('debug')('me2u:request-swarm')

const requestTypeMapping = {
  GET: 'OK',
  SUB: 'PUB_INIT',
  POST: 'CREATED',
  PUT: 'UPDATED',
  DELETE: 'DELETED',
  CLOSE: 'OK',
}

const decodeData = data =>
  data !== null && data.length > 0
    ? JSON.parse(Buffer.from(data).toString())
    : null

const responseMessage = code =>
  Object.keys(ResponseCode)[Object.values(ResponseCode).indexOf(code)]

class RequestError extends Error {
  constructor(message, code, path, data) {
    super(message)
    this.code = code
    this.path = path
    this.data = data
  }
}

class AbstractRequestSwarm extends AbstractSwarm {
  lastConnectionId = 0
  connections = new Map()

  currentRequestId = null
  requestQueue = new Map()

  constructor(docUrl, swarm, opts) {
    super({
      ...opts,
      topic: `annotations-${docUrl}`,
      lookup: true,
      announce: false,
      swarm,
    })
    this.docUrl = docUrl
    this.setMaxListeners(256)
  }

  async getAnnotations(opts = {}) {
    return await this.createRequest(
      opts.subscribe === true ? 'sub' : 'get',
      '/annotations.jsonld'
    )
  }

  async getAnnotation(id, opts = {}) {
    return await this.createRequest(
      opts.subscribe === true ? 'sub' : 'get',
      `/annotations/${id}.jsonld`
    )
  }

  async createAnnotation(annotation) {
    return await this.createRequest('post', '/annotations/', annotation)
  }

  async updateAnnotation(annotation) {
    const {annotationId} = parseId(annotation.id)
    return await this.createRequest(
      'put',
      `/annotations/${annotationId}.jsonld`,
      annotation
    )
  }

  async deleteAnnotation(id) {
    return await this.createRequest('delete', `/annotations/${id}.jsonld`)
  }

  async getRelated() {
    return await this.createRequest('get', '/related.json')
  }

  get firstConnectionId() {
    if (this.connections.size === 0) {
      return null
    }

    return this.connections.keys().next().value
  }

  createRequest(method, path, data = null) {
    const requestId = Buffer.from(uuid())
    this.requestQueue.set(requestId, {method, path, data})

    if (this.currentRequestId === null && this.connections.size > 0) {
      this._workQueue(this.firstConnectionId)
    }

    return new Promise((resolve, reject) => {
      const handleProcessed = (err, id, res) => {
        if (id !== requestId) {
          return
        }

        this.removeListener('processed-request', handleProcessed)
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      }
      this.on('processed-request', handleProcessed)
    })
  }

  _createSwarm(topic, swarm, joinOpts) {
    super._createSwarm(topic, swarm, joinOpts)
    debug(`joining distribution swarm: ${this.topic.toString('hex')} (client)`)
  }

  _createStream() {
    return new RequestStream()
  }

  _handleConnection(socket, info) {
    const stream = super._handleConnection(socket, info)

    const id = this.lastConnectionId++
    const createRequest = this._createRequestMethod(stream).bind(this)
    this.connections.set(id, {
      socket,
      createRequest,
    })

    socket.on('error', err => {
      if (err.code === 'ECONNRESET' && info.peer) {
        this.emit(
          'error',
          new Error(
            "Connection has been reset, peer probably won't accept new peers."
          )
        )
        return
      }

      throw err
    })

    socket.on('close', () => {
      this.connections.delete(id)
    })

    if (this.requestQueue.size > 0 && this.currentRequestId === null) {
      debug(
        `new connection ${id}, working request queue (${this.requestQueue.size} items)`
      )
      this._workQueue(id)
    }
  }

  /* FIXME: as we introduced request IDs, we could also work the queue in
      in parallel and not sequentially for a higher throughput. */
  async _workQueue(connectionId) {
    for (const [
      requestId,
      {method, path, data},
    ] of this.requestQueue.entries()) {
      debug(`working request item ${requestId}`)
      this.currentRequestId = requestId
      const {createRequest} = this.connections.get(connectionId)

      try {
        const res = await createRequest(method, requestId, path, data)
        this.emit('processed-request', null, requestId, res)
      } catch (err) {
        this.emit('processed-request', err, requestId)
      }
      this.requestQueue.delete(requestId)
    }

    this.currentRequestId = null
  }

  _createSubscription(stream, requestId, requestPath) {
    const subscription = new EventEmitter()
    subscription.close = async () => {
      debug(`closing subscription ${requestId.toString()}`)
      stream.removeListener('response', handleResponse)
      subscription.removeAllListeners()
    }

    const handleResponse = ({code, id, path, data}) => {
      const responseCode = responseMessage(code)
      if (
        !['PUB_DATA', 'PUB_CLOSE', 'PUB_ERROR'].includes(responseCode) ||
        !requestId.equals(id) ||
        requestPath !== path
      ) {
        return
      }

      const decodedData = decodeData(data)
      switch (responseCode) {
        case 'PUB_DATA':
          subscription.emit('pub', decodedData)
          break

        case 'PUB_CLOSE':
          subscription.emit('close')
          subscription.close()
          break

        case 'PUB_ERROR':
          subscription.emit('error', decodedData)
          subscription.close()
          break

        default:
          break
      }
    }

    stream.on('response', handleResponse)
    stream.once('close', () => {
      subscription.emit('close')
      subscription.close()
    })

    return subscription
  }

  _createRequestMethod(stream) {
    return (method, requestId, path, data) =>
      new Promise((resolve, reject) => {
        const requestMethod = method.toUpperCase()
        const goodCode = ResponseCode[requestTypeMapping[requestMethod]]

        const handleResponse = ({code, id, path, data}) => {
          if (!requestId.equals(id)) {
            return
          }
          stream.removeListener('response', handleResponse)

          const decodedData = decodeData(data)
          if (code !== goodCode) {
            reject(
              new RequestError(
                'Unexpected response code',
                responseMessage(code),
                path,
                decodedData
              )
            )
            return
          }

          if (responseMessage(code) === 'PUB_INIT') {
            resolve(this._createSubscription(stream, id, path))
          } else {
            resolve(decodedData)
          }
        }

        debug(`${requestMethod} ${path}`)
        stream.on('response', handleResponse)

        stream.request(requestMethod, requestId, path, data)
      })
  }
}

module.exports = {AbstractRequestSwarm}
