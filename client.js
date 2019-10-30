const {createStore} = require('./lib/repo-store')
const {distributeDocs} = require('./lib/distribution')

const volatile = process.argv.length > 2 && process.argv[2] === '-v'
if (volatile) {
  console.log('starting in-memory mode (volatile).')
}

async function main() {
  const repoStore = await createStore({volatile})
  const {id, repo, docs} =
    repoStore.size === 0
      ? await repoStore.addRepo()
      : Array.from(repoStore.repos.values())[0]

  console.log(`read repository with id: ${id}`)

  if (docs.length === 0) {
    const url = repo.create({hello: 'world'})
    await repoStore.addDoc(id, url)
  }

  const closeDistribution = distributeDocs(id, repo, repoStore)
  console.log('all repos are up for distribution.')

  // TODO: debug proper shutdown
  /* process.on('SIGINT', async () => {
    console.log('closing watchers...')

    await closeDistribution()
    await repoStore.destroy()

    process.exit(0)
  }) */
}

main()
