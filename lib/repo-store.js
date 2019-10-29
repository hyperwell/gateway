const fs = require('fs').promises
const {existsSync: fileExists} = require('fs')

const dbPath = `${__dirname}/../repos.json`

class RepoStore {
  repos = []

  async _init() {
    if (!fileExists(dbPath)) {
      this._saveRepos()
    }

    const data = JSON.parse(await fs.readFile(dbPath, 'utf8'))
    this.repos = data.repositories
  }

  async _saveRepos() {
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

  _getRepo(repoId) {
    return this.repos.find(repo => repo.id === repoId)
  }

  async addRepo(repoId, repo) {
    this.repos.push({
      id: repoId,
      hypermergeId: repo.id,
      docs: [],
    })

    await this._saveRepos()
    return this._getRepo(repoId)
  }

  async addDoc(repoId, docUrl) {
    const repo = this._getRepo(repoId)

    if (repo.docs.indexOf(docUrl) === -1) {
      repo.docs.push(docUrl)
      await this._saveRepos()
    }
  }

  async removeDoc(repoId, docUrl) {
    const repo = this._getRepo(repoId)
    repo.docs.splice(repo.docs.indexOf(docUrl), 1)

    await this._saveRepos()
  }
}

async function createStore() {
  const repoStore = new RepoStore()
  await repoStore._init()

  return repoStore
}

module.exports = {createStore}
