const Hyperswarm = require('hyperswarm')
const crypto = require('crypto')
const {DiscoverySwarm} = require('./discovery/swarm')
const {handleRequests} = require('./http-utils')
const debug = require('debug')('fm2u-distribution')

const swarms = new Map()

class DocumentDistributor {
  swarm = null
  discovery = null

  constructor(repo, target, docUrl) {
    this.target = target
    this.docUrl = docUrl
    this.repo = repo

    this._createSwarm(docUrl)
    this.discovery = new DiscoverySwarm(target, docUrl)
  }

  _createSwarm(docUrl) {
    const topic = crypto
      .createHash('sha256')
      .update(`annotations-${docUrl}`)
      .digest()

    debug(`joining distribution swarm ${topic.toString('hex')}`)
    this.swarm = Hyperswarm()
    this.swarm.join(topic, {
      lookup: false,
      announce: true,
    })

    this.swarm.on('connection', this._handleConnection)
  }

  _handleConnection = socket => {
    return handleRequests({
      '/annotations.jsonld': this._handleAnnotation,
      '/related.json': this._handleRelated,
    })(socket)
  }

  _handleAnnotation = async (req, res) => {
    debug(req.method, req.url)

    res.setHeader('Content-Type', 'application/ld+json')
    res.end(
      JSON.stringify(
        {
          state: await this.repo.doc(this.docUrl),
        },
        null,
        2
      )
    )
  }

  _handleRelated = async (req, res) => {
    debug(req.method, req.url)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/ld+json')
    res.end(
      JSON.stringify(
        {
          related: this.discovery.uniqueAnnouncements,
        },
        null,
        2
      )
    )
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
