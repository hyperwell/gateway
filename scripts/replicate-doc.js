const {createStore} = require('../lib/repo-store')

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node replicate-doc.js <doc-url> [-e]')
    process.exit(1)
  }

  const docUrl = process.argv[2]
  const edit = process.argv.length > 3 && process.argv[3] === '-e'
  console.log(`attemping to ${!edit ? 'view' : 'edit'} doc: ${docUrl}`)

  const repoStore = await createStore({volatile: true})
  const {id, repo} = await repoStore.addRepo()
  await repoStore.addDoc(id, docUrl)

  console.log(`reading repository: ${id}`)

  repo.watch(docUrl, doc =>
    console.log(`doc changed:
${JSON.stringify(doc, null, 2)}`)
  )

  if (edit) {
    repo.change(docUrl, state => {
      console.log('changing doc')
      state.random = Math.round(Math.random() * 1000)
    })
  }

  repo.doc(docUrl, state => {
    console.log(`current doc state:
${JSON.stringify(state, null, 2)}`)
  })
}

main()
