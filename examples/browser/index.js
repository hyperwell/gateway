require('core-js/stable')
require('regenerator-runtime/runtime')
const {RequestSwarm, DiscoverySwarm} = require('from-me-to-you/browser')

async function main() {
  const discoverySwarm = new DiscoverySwarm('https://www.example.com/foo')
  const docUrl = await new Promise(resolve =>
    discoverySwarm.on('ready', () => {
      discoverySwarm.once('announce', resolve)
    })
  )

  // const docUrl = window.location.hash.substr(1)
  console.log(`joining request swarm with doc url: ${docUrl}`)

  // initialize swarm, wait until it's ready
  const swarm = new RequestSwarm(docUrl, {
    handleError: function(err) {
      console.error('Bad error:', err)
    },
  })
  await new Promise(resolve => swarm.on('ready', resolve))

  // get current peer state
  console.log(`Current annotations:
${JSON.stringify(await swarm.getAnnotations(), null, 2)}`)
  console.log(`Related documents to target:
${JSON.stringify(await swarm.getRelated(), null, 2)}`)

  // create a subscription
  const subscription = await swarm.getAnnotations({subscribe: true})
  subscription.on('pub', data => {
    console.log(`PUB:
${JSON.stringify(data, null, 2)}`)

    document.getElementById('items').innerHTML = data
      .map(item => `<li>${item.message}</li>`)
      .join('')
  })
  subscription.on('close', () => console.log('PUB closed.'))
  subscription.on('error', err => console.error('PUB error:', err))

  // trigger subscription with a write action
  setTimeout(
    () =>
      swarm.createAnnotation({
        message: 'hello, world',
      }),
    2500
  )

  setTimeout(async () => await subscription.close(), 10000)
}

main()
