const assert = require('assert')
const {AbstractSwarm} = require('../abstract-swarm')
const {RequestStream} = require('./stream')
const {ResponseCode} = require('../messages')
const {parseId} = require('../annotation/meta')
const debug = require('debug')('me2u:request-swarm')

const requestTypeMapping = {
  GET: 'OK',
  POST: 'CREATED',
  PUT: 'UPDATED',
  DELETE: 'DELETED',
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

  lastRequestId = 0
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
  }

  async getAnnotations() {
    return await this.createRequest('get', '/annotations.jsonld')
  }

  async getAnnotation(id) {
    return await this.createRequest('get', `/annotations/${id}.jsonld`)
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

  get firstConnectionId() {
    if (this.connections.size === 0) {
      return null
    }

    return this.connections.keys().next().value
  }

  createRequest(method, path, data = null) {
    const requestId = this.lastRequestId++
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

  _handleConnection(socket) {
    const stream = super._handleConnection(socket)

    const id = this.lastConnectionId++
    const createRequest = this._createRequestMethod(stream).bind(this)
    this.connections.set(id, {
      socket,
      createRequest,
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

  async _workQueue(connectionId) {
    for (const [
      requestId,
      {method, path, data},
    ] of this.requestQueue.entries()) {
      debug(`working request item ${requestId}`)
      this.currentRequestId = requestId
      const {createRequest} = this.connections.get(connectionId)

      try {
        const res = await createRequest(method, path, data)
        this.emit('processed-request', null, requestId, res)
      } catch (err) {
        this.emit('processed-request', err, requestId)
      }
      this.requestQueue.delete(requestId)
    }

    this.currentRequestId = null
  }

  _createRequestMethod(stream) {
    return (method, path, data) =>
      new Promise((resolve, reject) => {
        const reqMethod = method.toUpperCase()
        const goodCode = ResponseCode[requestTypeMapping[reqMethod]]

        debug(`${reqMethod} ${path}`)
        stream.once('response', ({code, path, data}) => {
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
          resolve(decodedData)
        })

        stream.request(reqMethod, path, data)
      })
  }
}

module.exports = {AbstractRequestSwarm}
