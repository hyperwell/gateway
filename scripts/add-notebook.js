const {createStore} = require('../lib/repo-store')

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node replicate-doc.js <target> [<title>]')
    process.exit(1)
  }

  const target = process.argv[2]
  const title = process.argv.length > 3 ? process.argv[3] : null
  console.log(`attemping to add new notebook.
target: ${target}${title && ` (${title})`}`)

  const repoStore = await createStore()
  const {id, repo, docs} =
    repoStore.size === 0
      ? await repoStore.addRepo()
      : Array.from(repoStore.repos.values())[0]

  console.log(docs)
  const targets = (await Promise.all(docs.map(docUrl => repo.doc(docUrl)))).map(
    ({target}) => target
  )
  console.log(`existing docs:
${targets.join('\n')}
`)

  await repoStore.addDoc(id, target, title)
  console.log(`added notebook.`)
}

main()
