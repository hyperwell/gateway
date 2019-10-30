const {setTimeout} = require('timers')
const {DiscoverySwarm} = require('../lib/discovery/swarm')

const wait = async duration =>
  new Promise(resolve => setTimeout(resolve, duration))

if (process.argv.length < 3) {
  console.log('Usage: node announcement-test.js <url>')
  process.exit(1)
}

async function main() {
  const swarm = new DiscoverySwarm('some-target', process.argv[2])

  swarm.on('announce', url => {
    console.log(`New related document: ${url}`)
  })

  swarm.on('unannounce', url => {
    console.log(`Unannounced document: ${url}`)
  })

  await wait(2000)
  console.log(`Known documents:
${JSON.stringify(Array.from(swarm.announcements.values()), null, 2)}`)

  process.on('SIGINT', async () => {
    console.log('Closing network, unannouncing...')

    await swarm.destroy()
    process.exit(0)
  })
}

main()
