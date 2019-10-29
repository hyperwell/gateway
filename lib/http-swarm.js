const Hyperswarm = require('hyperswarm')
const sha256 = require('./sha256')
const {createHandler, handleRequests} = require('./http-utils')

function serveSwarm(repo, docUrl, related) {
  const swarm = Hyperswarm()

  console.log(`Joining second swarm: annotations-${docUrl}`)
  const topic = sha256(`annotations-${docUrl}`)

  swarm.join(topic, {
    lookup: true,
    announce: true,
  })

  const annotationHandler = createHandler(
    '/annotations.jsonld',
    async (req, res) => {
      console.log(req.method, req.url)

      const state = await repo.doc(docUrl)

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/ld+json')
      res.end(
        JSON.stringify(
          {
            state,
          },
          null,
          2
        )
      )
    }
  )

  const relatedHandler = createHandler('/related.json', (req, res) => {
    console.log(req.method, req.url)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/ld+json')
    res.end(
      JSON.stringify(
        {
          related: [],
        },
        null,
        2
      )
    )
  })

  swarm.on('connection', handleRequests([annotationHandler, relatedHandler]))

  return async () => new Promise(resolve => swarm.destroy(() => resolve()))
}

module.exports = {serveSwarm}
