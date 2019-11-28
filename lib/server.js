const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const {
  SwarmError,
  ERROR_NOT_FOUND,
  ERROR_BAD_DOC,
  ERROR_BAD_REQUEST,
} = require('./error')
const {
  encodeDocUrl,
  decodeDocUrl,
  normalizeAnnotation,
  denormalizeAnnotation,
} = require('./util')
const debug = require('debug')('hyperwell:gateway:server')

let server
const hostname = 'localhost'

const handleError = err => {
  if (err instanceof SwarmError) {
    if (err.code === ERROR_NOT_FOUND || err.code === ERROR_BAD_DOC) {
      return Boom.notFound()
    } else if (err.code === ERROR_BAD_REQUEST) {
      return Boom.badRequest()
    }
  }

  console.error(err)
  return Boom.internal()
}

async function createServer(backendSwarm, port) {
  server = Hapi.server({
    port,
    host: hostname,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
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
        const annotations = await backendSwarm.getAnnotations(docUrl)
        return annotations.map(annotation =>
          denormalizeAnnotation('localhost', docUrl, annotation, {
            port,
          })
        )
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
      const annotation = request.payload

      try {
        const annotationId = await backendSwarm.createAnnotation(
          docUrl,
          annotation
        )
        return h.redirect(
          `http://localhost:${port}/annotations/${encodeDocUrl(
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
    path: '/annotations/{container}/{id}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)
      const annotation = request.payload
      try {
        return await backendSwarm.updateAnnotation(
          docUrl,
          // FIXME: add error handling for invalid annotations (e.g., wrong ID)
          normalizeAnnotation(hostname, docUrl, annotation, {port})
        )
      } catch (err) {
        return handleError(err)
      }
    },
  })

  // TODO: delete

  server.route({
    method: 'PUT',
    path: '/annotations/announce',
    handler: async (request, h) => {
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
  console.error(err)
  process.exit(1)
})

module.exports = {createServer}
