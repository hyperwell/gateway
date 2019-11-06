const readline = require('readline')
const {RequestSwarm} = require('../lib/request/swarm')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

if (process.argv.length < 3) {
  console.log('usage: node console.js <doc-url>')
  process.exit(1)
}

async function main() {
  const docUrl = process.argv[2]
  const swarm = new RequestSwarm(docUrl, {
    handleError: err => {
      console.error(err)
      process.exit(1)
    },
  })

  let run = true
  while (run) {
    await new Promise(resolve => {
      rl.question('Request (<method path>): ', async answer => {
        if (
          !answer ||
          answer === 'q' ||
          answer === 'quit' ||
          answer === 'exit'
        ) {
          process.exit(0)
        }

        const [method, path] = answer.split(' ')
        try {
          const data = await swarm.createRequest(method, path)
          console.log(JSON.stringify(data, null, 2))
        } catch (err) {
          console.error('Error while processing:\n', err)
        }

        resolve()
      })
    })
  }

  rl.close()
}

main()
