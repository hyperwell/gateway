require('core-js/stable')
require('regenerator-runtime/runtime')
const {RequestSwarm} = require('from-me-to-you/browser')

async function main() {
  const docUrl = window.location.hash.substr(1)
  console.log(`joining request swarm with doc url: ${docUrl}`)

  const swarm = new RequestSwarm(docUrl, {
    handleError: function(err) {
      console.error('Bad error:', err)
    },
  })
  await new Promise(resolve => swarm.on('ready', resolve))

  console.log(await swarm.getAnnotations())
  console.log(await swarm.getRelated())
}

main()
