const uuid = require('uuid/v1')
const {DiscoverySwarm} = require('./discovery/swarm')
const {ResponseSwarm} = require('./response/swarm')
const debug = require('debug')('me2u:distribution')

const swarms = new Map()

class DocumentDistributor extends ResponseSwarm {
  discovery = null

  constructor(repo, target, docUrl) {
    super(`annotations-${docUrl}`)

    this.target = target
    this.docUrl = docUrl
    this.repo = repo

    this.discovery = new DiscoverySwarm(target, docUrl)

    this.setHandler('get', '/annotations.jsonld', this._handleGetAllAnnotations)
    this.setHandler('get', '/annotations/:id.jsonld', this._handleGetAnnotation)
    this.setHandler('get', '/related.json', this._handleRelated)
    this.setHandler('post', '/annotations/', this._handleCreateAnnotation)
    this.setHandler(
      'put',
      '/annotations/:id.jsonld',
      this._handleUpdateAnnotation
    )
  }

  _handleGetAllAnnotations = async () => {
    const doc = await this.repo.doc(this.docUrl)
    const annotations = Array.isArray(doc.annotations) ? doc.annotations : []

    return {
      code: 'OK',
      data: annotations.map(annotation => ({
        ...annotation,
        '@context': 'http://www.w3.org/ns/anno.jsonld',
        id: `${this.docUrl}/annotations/${annotation.id}.jsonld`,
        type: 'Annotation',
      })),
    }
  }

  _handleGetAnnotation = async (method, path, params) => {
    const annotations = await this.repo.doc(this.docUrl)
    const annotation = annotations.find(({id}) => id === params.id)

    if (!annotation) {
      return {
        code: 'NOT_FOUND',
      }
    }

    return {
      code: 'OK',
      data: {
        ...annotation,
        '@context': 'http://www.w3.org/ns/anno.jsonld',
        id: `${this.docUrl}/annotations/${params.id}.jsonld`,
        type: 'Annotation',
      },
    }
  }

  _handleCreateAnnotation = async (method, path, params, data) => {
    // TODO validate with JSON schema

    const id = uuid()
    await new Promise(resolve =>
      this.repo.change(this.docUrl, state => {
        if (typeof state.annotations === 'undefined') {
          state.annotations = []
        }

        state.annotations.push({
          ...data,
          id,
        })
        resolve()
      })
    )

    return {
      code: 'CREATED',
      data: {
        location: `/annotations/${id}.jsonld`,
      },
    }
  }

  _handleUpdateAnnotation = async (method, path, params, data) => {
    // TODO validate with JSON schema

    const found = await new Promise(resolve =>
      this.repo.change(this.docUrl, state => {
        const index = state.annotations.findIndex(({id}) => id === params.id)
        if (index < 0) {
          resolve(false)
        }

        state.annotations[index] = data
        resolve(true)
      })
    )

    return {
      code: found ? 'OK' : 'NOT_FOUND',
    }
  }

  _handleRelated = async () => ({
    code: 'OK',
    data: this.discovery.uniqueAnnouncements,
  })

  async destroy() {
    await this.discovery.destroy()
    return new Promise(resolve => this.swarm.destroy(resolve))
  }
}

function distributeDocs(repoId, repo, repoStore) {
  const docs = repoStore.getDocs(repoId)
  for (const docUrl of docs) {
    // TODO fixme when web annotation data model parsing established
    const target = docUrl

    swarms.set(docUrl, new DocumentDistributor(repo, target, docUrl))
  }

  repoStore.on('doc-added', docUrl => {
    // TODO fixme when web annotation data model parsing established
    const target = docUrl

    swarms.set(docUrl, new DocumentDistributor(repo, target, docUrl))
  })

  repoStore.on('doc-removed', async docUrl => {
    const swarm = swarms.get(docUrl)
    await swarm.destroy()

    swarms.remove(docUrl)
  })

  return async () =>
    Promise.all(Array.from(swarms.values()).map(swarm => swarm.destroy()))
}

module.exports = {distributeDocs, DocumentDistributor}
