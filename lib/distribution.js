const {DiscoverySwarm} = require('./discovery/swarm')
const {ResponseSwarm} = require('./bridge/response-swarm')
const debug = require('debug')('fm2u-distribution')

const swarms = new Map()

class DocumentDistributor extends ResponseSwarm {
  discovery = null

  constructor(repo, target, docUrl) {
    super(`annotations-${docUrl}`)

    this.target = target
    this.docUrl = docUrl
    this.repo = repo

    this.discovery = new DiscoverySwarm(target, docUrl)

    this.setHandler('get', '/annotations.jsonld', this._handleAnnotations)
    this.setHandler('get', '/related.json', this._handleRelated)
  }

  _handleAnnotations = async (method, path, params, data) => {
    debug(method, path, params)

    return {
      code: 'OK',
      data: await this.repo.doc(this.docUrl),
    }
  }

  _handleRelated = async (method, path, params, data) => {
    debug(method, path, params)

    return {
      code: 'OK',
      data: this.discovery.uniqueAnnouncements,
    }
  }

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
