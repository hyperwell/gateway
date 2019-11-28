const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const {
  SwarmError,
  ERROR_NOT_FOUND,
  ERROR_BAD_DOC,
  ERROR_BAD_REQUEST,
} = require('./error')

let server

const encodeDocUrl = docUrl => Buffer.from(docUrl).toString('hex')
const decodeDocUrl = encodedDocUrl =>
  Buffer.from(encodedDocUrl, 'hex').toString()

const handleError = err => {
  if (err instanceof SwarmError) {
    if (err.code === ERROR_NOT_FOUND || err.code === ERROR_BAD_DOC) {
      return Boom.notFound()
    } else if (err.code === ERROR_BAD_REQUEST) {
      return Boom.badRequest()
    }
  }

  return Boom.internal()
}

async function createServer(backendSwarm, port) {
  server = Hapi.server({
    port,
    host: 'localhost',
  })

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
      return "Hi! I'm a Web Annotation P2P gateway."
    },
  })

  server.route({
    method: 'GET',
    path: '/annotations/{container}/',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)

      try {
        return await backendSwarm.getAnnotations(docUrl)
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'GET',
    path: '/annotations/{container}/{id}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)

      try {
        return await backendSwarm.getAnnotation(docUrl, request.params.id)
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'POST',
    path: '/annotations/{container}/',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)

      try {
        const annotationId = await backendSwarm.createAnnotation(
          docUrl,
          request.payload.annotation
        )
        return h.redirect(
          `http://localhost:3000/annotations/${encodeDocUrl(
            docUrl
          )}/${annotationId}`
        )
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'PUT',
    path: '/annotations/announce',
    handler: async (request, h) => {
      console.log(request.payload)

      if (typeof request.payload !== 'object' || !request.payload.docUrl) {
        return Boom.badRequest()
      }

      return `/annotations/${encodeDocUrl(request.payload.docUrl)}/`
    },
  })

  await server.start()
  console.log('Server running on %s', server.info.uri)

  return server
}

process.on('unhandledRejection', err => {
  console.log(err)
  process.exit(1)
})

module.exports = {createServer}
