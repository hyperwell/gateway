const uuid = require('uuid/v1')
const {Repo} = require('hypermerge')
const Hyperswarm = require('hyperswarm')
const Cache = require('node-cache')
const {SwarmError} = require('./error')
const AbstractSwarm = require('./abstract-swarm')
const debug = require('debug')('hyperwell:gateway:swarm')

const cacheTTL = 0

// FIXME: validate with JSON schema
const validDoc = doc => Array.isArray(doc.annotations)
const findAnnotation = (doc, annotationId) => {
  if (!validDoc(doc)) {
    throw SwarmError.badDoc()
  }

  const index = doc.annotations.findIndex(({id}) => id === annotationId)
  return index > -1
    ? [true, doc.annotations[index], index]
    : [false, index, null]
}

class HyperwellSwarm extends AbstractSwarm {
  constructor() {
    super()

    this.repo = new Repo({
      memory: true,
    })
    this.repo.setSwarm(Hyperswarm(), {
      lookup: true,
      announce: false,
    })

    this.cache = new Cache({
      stdTTL: cacheTTL,
      checkPeriod: 60,
    })
    this.cache.on('expired', this._handleDocExpired)
    this.cache.on('del', this._handleDocExpired)
  }

  async getAnnotations(docUrl) {
    const doc = await this.repo.doc(docUrl)

    if (!validDoc(doc)) {
      throw SwarmError.badDoc()
    }

    this.cache.set(docUrl, true)
    return doc.annotations
  }

  async getAnnotation(docUrl, annotationId) {
    const doc = await this.repo.doc(docUrl)
    const [found, annotation] = findAnnotation(doc, annotationId)
    if (!found) {
      throw SwarmError.notFound()
    }

    this.cache.set(docUrl, true)
    return annotation
  }

  async createAnnotation(docUrl, annotation) {
    // FIXME: validate with JSON schema
    // if (annotation.id || !annotation.body) {
    if (annotation.id) {
      throw SwarmError.badRequest()
    }

    const id = uuid()
    await new Promise((resolve, reject) =>
      this.repo.change(docUrl, doc => {
        // FIXME: validate with JSON schema
        if (!validDoc(doc)) {
          reject(SwarmError.badDoc())
        }

        doc.annotations.push({
          ...annotation,
          id,
        })

        resolve()
      })
    )

    this.cache.set(docUrl, true)
    return id
  }

  async updateAnnotation(docUrl, annotation) {
    // FIXME: validate with JSON schema
    // if (annotation.id || !annotation.body) {
    if (!annotation.id) {
      throw SwarmError.badRequest()
    }

    await new Promise((resolve, reject) =>
      this.repo.change(docUrl, doc => {
        const [found, previousAnnotation, index] = findAnnotation(
          doc,
          annotation.id
        )
        if (!found) {
          reject(SwarmError.notFound())
        }

        doc.annotations.splice(index, 1, annotation)
        resolve()
      })
    )

    this.cache.set(docUrl, true)
    return annotation
  }

  async deleteAnnotation(docUrl, annotationId) {
    await new Promise((resolve, reject) =>
      this.repo.change(docUrl, doc => {
        const [found, annotation, index] = findAnnotation(doc, annotationId)
        if (!found) {
          reject(SwarmError.notFound())
        }

        doc.annotations.splice(index, 1)
        resolve()
      })
    )

    this.cache.set(docUrl, true)
  }

  async subscribeToAnnotations(docUrl, subscription) {
    const annotations = await this.getAnnotations(docUrl)
    subscription.init(annotations)

    const handle = this.repo.watch(docUrl, doc => {
      if (!validDoc(doc)) {
        return
      }

      const diff = subscription.diff(doc.annotations)
      if (diff !== null) {
        subscription.emit('change', diff)
      }
    })

    subscription.on('close', () => handle.close())
  }

  _handleDocExpired = docUrl => {
    debug('document expired:', docUrl)
    // this.repo.destroy(docUrl)
  }

  async destroy() {
    this.cache.close()
  }
}

module.exports = HyperwellSwarm
