const {Repo} = require('hypermerge')
const Hyperswarm = require('hyperswarm')
const uuid = require('uuid/v1')
const {createStore} = require('./lib/repo-store')
const {distributeDocs} = require('./lib/distribution')
const {DiscoverySwarm} = require('./lib/discovery/swarm')

const volatile = process.argv.length > 2 && process.argv[2] === '-v'
if (volatile) {
  console.log('Starting in-memory mode (volatile).')
}

async function main() {
  const repoStore = await createStore(volatile)
  let repo, id, repoConf

  if (repoStore.repos.length === 0) {
    id = uuid()
    repo = new Repo({
      path: `${__dirname}/../.data/${id}`,
      memory: volatile,
    })
    repoConf = await repoStore.addRepo(id, repo)
  } else {
    repoConf = repoStore.repos[0]
    id = repoConf.id
    repo = new Repo({
      path: `${__dirname}/../.data/${id}`,
      memory: volatile,
    })
  }

  console.log(`Read repository with id: ${id}`)

  repo.setSwarm(Hyperswarm())
  console.log('Joined swarm.')

  if (repoConf.docs.length === 0) {
    const url = repo.create({hello: 'world'})
    console.log(await repo.doc(url))

    await repoStore.addDoc(id, url)
  }

  console.log(`Watching doc: ${repoConf.docs[0]}`)

  const handles = await Promise.all(
    repoConf.docs.map(docUrl =>
      repo.watch(docUrl, () => console.log(`Update at: ${docUrl}`))
    )
  )

  const leaveSwarms = distributeDocs(id, repo, repoStore)
  const discoverySwarm = new DiscoverySwarm(
    'some-example-target',
    repoConf.docs[0]
  )

  process.on('SIGINT', async () => {
    console.log('Closing watchers...')

    await discoverySwarm.destroy()

    await leaveSwarms()
    handles.forEach(handle => handle.close())
    repo.close()

    process.exit(0)
  })
}

main()
