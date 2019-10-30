const fs = require('fs').promises

const {EventEmitter} = require('events')
const {existsSync: fileExists} = require('fs')

const dbPath = `${__dirname}/../repos.json`

class RepoStore extends EventEmitter {
  repos = []

  constructor(volatile = false) {
    super()

    this.volatile = volatile
  }

  async _init() {
    if (!fileExists(dbPath)) {
      this._saveRepos()
    }

    if (!this.volatile) {
      const data = JSON.parse(await fs.readFile(dbPath, 'utf8'))
      this.repos = data.repositories
    }
  }

  async _saveRepos() {
    if (!this.volatile) {
      await fs.writeFile(
        dbPath,
        JSON.stringify(
          {
            repositories: this.repos,
          },
          null,
          2
        )
      )
    }
  }

  _getRepo(repoId) {
    return this.repos.find(repo => repo.id === repoId)
  }

  async addRepo(repoId, repo) {
    const repoEntry = {
      id: repoId,
      hypermergeId: repo.id,
      docs: [],
    }

    this.repos.push(repoEntry)
    await this._saveRepos()

    this.emit('repo-added', repoEntry)
    return repoEntry
  }

  async addDoc(repoId, docUrl) {
    const repo = this._getRepo(repoId)

    if (repo.docs.indexOf(docUrl) === -1) {
      repo.docs.push(docUrl)
      await this._saveRepos()
      this.emit('doc-added', repoId, docUrl)
    }
  }

  getDocs(repoId) {
    const repo = this._getRepo(repoId)
    return repo ? repo.docs : null
  }

  async removeDoc(repoId, docUrl) {
    const repo = this._getRepo(repoId)
    repo.docs.splice(repo.docs.indexOf(docUrl), 1)

    await this._saveRepos()
    this.emit('repo-removed', repoId, docUrl)
  }
}

async function createStore(volatile) {
  const repoStore = new RepoStore(volatile)
  await repoStore._init()

  return repoStore
}

module.exports = {createStore, RepoStore}
