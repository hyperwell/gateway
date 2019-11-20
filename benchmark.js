/* benchmark suite to learn about request/response performance of the bridge
    network. make sure to know whether you run a local or remote gateway. */
const microtime = require('microtime')
const {createStore} = require('./lib/repo-store')
const {distributeDocs} = require('./lib/distribution')
const {createFixtureSet, waitOnReady, wait} = require('./test/util.js')
const {RequestSwarm} = require('./lib/request/browser-swarm')

const loadNumber = 15
const loadReqs = 100

const subSwarms = []

async function main() {
  const repoStore = await createStore({volatile: true})
  const {id, repo} = await repoStore.addRepo()
  const docUrl = await repoStore.addDoc(
    id,
    'https://www.example.com/foo',
    'Benchmark Notebook'
  )
  const fixtureSet = createFixtureSet(docUrl, 1000)
  console.log(
    `running benchmark with ${loadNumber} subscription swarms, ${loadReqs} edits, annotations of ${Buffer.byteLength(
      JSON.stringify(fixtureSet),
      'utf8'
    ) / 1000} kilobytes.`
  )

  const closeDistribution = distributeDocs(id, repo, repoStore)
  await wait(500)

  console.log('creating request swarm...')
  const requestSwarm = new RequestSwarm(docUrl)
  requestSwarm.on('ready', () => console.log('ready'))
  await waitOnReady(requestSwarm)

  console.log('creating subscription swarms...')
  for (let i = 0; i < loadNumber; i++) {
    subSwarms.push(new RequestSwarm(docUrl))
  }
  await Promise.all(subSwarms.map(swarm => waitOnReady(swarm)))

  const close = async () => {
    await Promise.all(subSwarms.map(swarm => swarm.destroy()))
    await closeDistribution()
    await repoStore.destroy()
  }

  try {
    await repo.change(docUrl, state => ({
      ...state,
      annotations: fixtureSet,
    }))

    const subscriptions = await Promise.all(
      subSwarms.map(swarm =>
        swarm.getAnnotations({
          subscribe: true,
        })
      )
    )

    let reqs = 0
    const startTime = microtime.now()
    const logInterval = setInterval(() => {
      console.log(
        `did ${reqs} requests (${reqs *
          (1000 / (startTime - microtime.now()))} req/us)`
      )
    }, 1000)

    const edits = []
    for (let j = 0; j < loadReqs; j++, reqs++) {
      const editFixture = fixtureSet[0]
      editFixture.body.value = `Edit ${j}}`
      edits.push(requestSwarm.updateAnnotation(editFixture))
      // await wait(25)
    }
    await Promise.all(edits)

    clearInterval(logInterval)

    console.log(
      `SUMMARY >>> ${reqs} requests (${reqs *
        (1000 / (startTime - microtime.now()))} req/us)`
    )
  } catch (err) {
    throw err
  } finally {
    console.log('finished. cleaning up...')
    await close()
    console.log('completely done.')
  }
}

main()
