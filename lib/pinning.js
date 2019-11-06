const Hyperswarm = require('hyperswarm')
const debug = require('debug')('me2u:pinning')

class PinningSwarm {
  swarm = null
  entry = null
  repoStore = null

  handles = []

  constructor(id, repoStore) {
    debug(`initializing pinning for repo ${id}`)

    this.id = id
    this.entry = repoStore.repos.get(id)
    this.repoStore = repoStore
    const {repo} = this.entry

    this._createSwarm(repo)

    const watchRepo = docUrl =>
      repo.watch(docUrl, () => debug(`update for ${docUrl}`))

    this.handles = this.entry.docs.map(watchRepo)

    repoStore.on('doc-added', (id, docUrl) => {
      if (id === this.id) {
        this.handles.push(watchRepo(docUrl))
      }
    })
  }

  _createSwarm(repo) {
    this.swarm = Hyperswarm()
    repo.setSwarm(this.swarm)
  }

  async destroy() {
    this.handles.forEach(handle => handle.close())
    return new Promise(resolve => this.swarm.destroy(resolve))
  }
}

class PinningService {
  repoStore = null
  swarms = new Map()

  constructor(repoStore) {
    this.repoStore = repoStore

    for (const {id} of repoStore.repos.values()) {
      this.swarms.set(id, new PinningSwarm(id, repoStore))
    }

    repoStore.on('repo-added', this._handleRepoAdded)
  }

  _handleRepoAdded = ({id}) => {
    this.swarms.set(id, new PinningSwarm(id, this.repoStore))
  }

  async destroy() {
    return Promise.all(
      Array.from(this.swarms.values()).map(swarm => swarm.destroy())
    )
  }
}

module.exports = {PinningService}
