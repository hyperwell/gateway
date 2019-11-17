const fs = require('fs').promises
const {EventEmitter} = require('events')
const {existsSync} = require('fs')
const uuid = require('uuid/v1')
const {Repo} = require('hypermerge')
const {PinningService} = require('./pinning')

const dbPath = `${__dirname}/../repos.json`

class RepoStore extends EventEmitter {
  repos = new Map()

  constructor({volatile = false}) {
    super()
    this.volatile = volatile
  }

  async _init() {
    if (!existsSync(dbPath)) {
      this._saveRepos()
    }

    if (!this.volatile) {
      const data = JSON.parse(await fs.readFile(dbPath, 'utf8'))
      for (const {id, hypermergeId, docs} of data.repositories) {
        this.repos.set(id, {
          id,
          repo: this._initRepo(id),
          hypermergeId,
          docs,
        })
      }
    }

    this.pinningService = new PinningService(this)
  }

  _initRepo(id) {
    return new Repo({
      path: `${__dirname}/../.data/${id}`,
      memory: this.volatile,
    })
  }

  get size() {
    return this.repos.size
  }

  async _saveRepos() {
    if (this.volatile) {
      return
    }

    await fs.writeFile(
      dbPath,
      JSON.stringify(
        {
          repositories: this.plainRepos,
        },
        null,
        2
      )
    )
  }

  get plainRepos() {
    return Array.from(this.repos.values()).map(({id, hypermergeId, docs}) => ({
      id,
      hypermergeId,
      docs,
    }))
  }

  async addRepo() {
    const id = uuid()
    const repo = this._initRepo(id)

    const entry = {
      id,
      repo,
      hypermergeId: repo.id,
      docs: [],
    }

    this.repos.set(id, entry)
    await this._saveRepos()

    this.emit('repo-added', entry)
    return entry
  }

  async addDoc(id, target, title) {
    const entry = this.repos.get(id)
    const notebook = {
      target,
      annotations: [],
    }
    if (title) {
      notebook.title = title
    }

    const docUrl = await entry.repo.create(notebook)
    entry.docs.push(docUrl)
    await this._saveRepos()
    this.emit('doc-added', id, docUrl)

    return docUrl
  }

  getDocs(id) {
    const entry = this.repos.get(id)
    return entry ? entry.docs : null
  }

  getDocRepos(docUrl) {
    const repos = []

    for (const {id, repo, docs} of this.repos.values()) {
      if (docs.includes(docUrl)) {
        repos.push({id, repo})
      }
    }

    return repos
  }

  async removeDoc(id, docUrl) {
    const entry = this.repos.get(id)
    entry.docs.splice(entry.docs.indexOf(docUrl), 1)

    await this._saveRepos()
    this.emit('doc-removed', id, docUrl)
  }

  async destroy() {
    await this.pinningService.destroy()

    for (const {repo} of this.repos.values()) {
      repo.close()
    }
  }
}

async function createStore(volatile) {
  const repoStore = new RepoStore(volatile)
  await repoStore._init()

  return repoStore
}

module.exports = {createStore, RepoStore}
