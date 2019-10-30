const Hyperswarm = require('hyperswarm')
const crypto = require('crypto')
const {handleRequests} = require('./http-utils')

const swarms = new Map()

class DocumentDistributor {
  swarm = null

  constructor(repo, target, docUrl) {
    this.target = target
    this.docUrl = docUrl
    this.repo = repo

    this._createSwarm(docUrl)
  }

  _createSwarm(docUrl) {
    const topic = crypto
      .createHash('sha256')
      .update(`annotations-${docUrl}`)
      .digest()

    this.swarm = Hyperswarm()
    this.swarm.join(topic, {
      lookup: true,
      announce: false,
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
    console.log(req.method, req.url)

    const state = await repo.doc(docUrl)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/ld+json')
    res.end(
      JSON.stringify(
        {
          state,
        },
        null,
        2
      )
    )
  }

  _handleRelated = async (req, res) => {
    console.log(req.method, req.url)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/ld+json')
    res.end(
      JSON.stringify(
        {
          related: [],
        },
        null,
        2
      )
    )
  }

  async destroy() {
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

  return async () =>
    Promise.all(Array.from(swarms.values()).map(swarm => swarm.destroy()))
}

module.exports = {distributeDocs, DocumentDistributor}
