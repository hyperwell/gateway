const {readFile} = require('fs').promises
const {createStore} = require('../lib/repo-store')

async function main() {
  if (process.argv.length < 4) {
    console.log('Usage: node ingest.js <doc-id> <file-path>')
    process.exit(1)
  }

  const docUrl = process.argv[2]
  const filePath = process.argv[3]
  console.log(`attemping to ingest data.
document: ${docUrl}`)

  const repoStore = await createStore()
  const entries = repoStore.getDocRepos(docUrl)
  if (entries.length === 0) {
    console.log('no repositories with that docUrl present.')
    process.exit(1)
  }

  const data = JSON.parse(await readFile(filePath, 'utf8')).map(annotation => ({
    ...annotation,
    id: `${docUrl}/annotations/${annotation.annotation_id}.jsonld`,
  }))

  console.log(data)

  const {repo} = entries[0]
  await repo.change(docUrl, state => {
    state.annotations = data
  })

  console.log(`done.`)
}

main()
