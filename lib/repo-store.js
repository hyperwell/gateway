const fs = require('fs').promises;
const uuid = require('uuid/v1');

const dbPath = `${__dirname}/../repos.json`;

class RepoStore {
  repos = [];

  async _init() {
    const data = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    this.repos = data.repositories;
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
    );
  }

  _getRepo(repoId) {
    return this.repos.find(repo => repo.id === repoId);
  }

  async addRepo(repo) {
    this.repos.push({
      id: uuid,
      hypermergeId: repo.id,
      docs: [],
    });

    await this._saveRepos();
  }

  async addDoc(repoId, docUrl) {
    const repo = this._getRepo(repoId);

    if (repo.docs.indexOf(docUrl) === -1) {
      repo.docs.push(docUrl);
      await this._saveRepos();
    }
  }

  async removeDoc(repoId, docUrl) {
    const repo = this._getRepo(repoId);
    repo.docs.splice(repo.docs.indexOf(docUrl), 1);

    await this._saveRepos();
  }
}

module.exports = async function createStore() {
  const repoStore = new RepoStore();
  await repoStore._init();

  return repoStore;
};
