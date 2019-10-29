const {Repo} = require('hypermerge')
const Hyperswarm = require('hyperswarm')
const uuid = require('uuid/v1')
const {createStore} = require('./lib/repo-store')
const {serveSwarm} = require('./lib/http-swarm')
// const {announceDocument, unannounceAll} = require('./lib/related-swarm')

async function main() {
  const repoStore = await createStore()
  let repo, id, repoConf

  if (repoStore.repos.length === 0) {
    const id = uuid()
    repo = new Repo({path: `${__dirname}/../.data/${id}`})
    repoConf = await repoStore.addRepo(id, repo)
    id = repoConf.id
  } else {
    repoConf = repoStore.repos[0]
    id = repoConf.id
    repo = new Repo({path: `${__dirname}/../.data/${id}`})
  }

  console.log(`Read repository with id: ${id}`)

  repo.setSwarm(Hyperswarm())
  console.log('Joined swarm.')

  if (repoConf.docs.length === 0) {
    const url = repo.create({hello: 'world'})
    console.log(await repo.doc(url))

    await repoStore.addDoc(id, url)
  } else {
    console.log(`Watching doc: ${repoConf.docs[0]}`)

    const handles = await Promise.all(
      repoConf.docs.map(docUrl =>
        repo.watch(docUrl, () => console.log(`Update at: ${docUrl}`))
      )
    )

    const leaveSwarm = serveSwarm(repo, repoConf.docs[0])
    // await announceDocument('foo-bar-example', repoConf.docs[0]);

    process.on('SIGINT', async () => {
      console.log('Closing watchers...')

      // await unannounceAll();

      await leaveSwarm()
      handles.forEach(handle => handle.close())
      repo.close()

      process.exit(0)
    })
  }
}

main()
