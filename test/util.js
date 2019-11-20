const {createStore} = require('../lib/repo-store')
const {distributeDocs} = require('../lib/distribution')

const fixture = {
  '@context': 'http://www.w3.org/ns/anno.jsonld',
  type: 'Annotation',
  body: {
    type: 'TextualBody',
    value: 'Comment text',
    format: 'text/plain',
  },
  target: 'https://www.example.org/foo',
}

const createFixtureSet = (docUrl, n) => {
  const set = []
  for (let i = 0; i < n; i++) {
    set.push({
      ...fixture,
      id: `${docUrl}/${i}.jsonld`,
    })
  }
  return set
}

const wait = duration => new Promise(resolve => setTimeout(resolve, duration))
const waitOnReady = swarm => new Promise(resolve => swarm.on('ready', resolve))

const initPeer = async test => {
  const repoStore = await createStore({volatile: true})
  const {id, repo} = await repoStore.addRepo()
  const url = repo.create({annotations: []})
  await repoStore.addDoc(id, url)

  const closeDistribution = distributeDocs(id, repo, repoStore)

  const handleFinish = async () => {
    await closeDistribution()
    await repoStore.destroy()
  }
  test.onFinish(handleFinish)
  test.onFailure(handleFinish)

  return url
}

module.exports = {
  fixture,
  createFixtureSet,
  wait,
  waitOnReady,
  initPeer,
}
