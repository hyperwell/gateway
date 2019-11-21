const {createStore} = require('../lib/repo-store')

async function main() {
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

  for (const docUrl of docs) {
    const doc = await repo.doc(docUrl)
    console.log(docUrl, '\n', doc.target, '\n\n')
  }
}

main()
