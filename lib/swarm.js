const uuid = require('uuid/v1')
const {Repo} = require('hypermerge')
const Hyperswarm = require('hyperswarm')
const Cache = require('node-cache')
const {SwarmError} = require('./error')
const AbstractSwarm = require('./abstract-swarm')
const debug = require('debug')('hyperwell:gateway:swarm')

const cacheTTL = 60 * 10

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

  async createAnnotationsBatch(docUrl, annotations) {
    // FIXME: validate with JSON schema
    if (annotations.some(annotation => annotation.id)) {
      throw SwarmError.badRequest()
    }

    const newAnnotations = annotations.map(annotation => ({
      ...annotation,
      id: uuid(),
    }))
    await new Promise((resolve, reject) =>
      this.repo.change(docUrl, doc => {
        // FIXME: validate with JSON schema
        if (!validDoc(doc)) {
          reject(SwarmError.badDoc())
        }

        for (const newAnnotation of newAnnotations) {
          doc.annotations.push(newAnnotation)
        }

        resolve()
      })
    )

    this.cache.set(docUrl, true)
    return newAnnotations
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

  async updateAnnotationsBatch(docUrl, changedAnnotations) {
    // FIXME: validate with JSON schema
    if (changedAnnotations.some(annotation => !annotation.id)) {
      throw SwarmError.badRequest()
    }

    await new Promise((resolve, reject) =>
      this.repo.change(docUrl, doc => {
        // FIXME: validate with JSON schema
        if (!validDoc(doc)) {
          reject(SwarmError.badDoc())
        }

        const changedIds = changedAnnotations.map(({id}) => id)
        for (let i = 0; i < doc.annotations.length; i++) {
          var j = changedIds.indexOf(doc.annotations[i].id)
          if (j > -1) {
            doc.annotations.splice(i, 1, changedAnnotations[j])
          }
        }
        resolve()
      })
    )
    this.cache.set(docUrl, true)
    return changedAnnotations
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

  async deleteAnnotationsBatch(docUrl, deletedAnnotations) {
    // FIXME: validate with JSON schema
    if (deletedAnnotations.some(annotation => !annotation.id)) {
      throw SwarmError.badRequest()
    }

    const deletedAnnotationIds = deletedAnnotations.map(({id}) => id)
    await new Promise(resolve =>
      this.repo.change(docUrl, doc => {
        for (const annotationId of deletedAnnotationIds) {
          // FIXME: validate if all deleted annotations exist
          const [found, annotation, index] = findAnnotation(doc, annotationId)
          if (found) {
            doc.annotations.splice(index, 1)
          }
        }
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
    this.repo.close(docUrl)
  }

  async destroy() {
    this.cache.close()
  }
}

module.exports = HyperwellSwarm
