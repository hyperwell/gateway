const assert = require('assert')
const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const WebSocketPlugin = require('hapi-plugin-websocket')
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
const Subscription = require('./subscription')
const debug = require('debug')('hyperwell:gateway:server')

let server

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

async function createServer(backendSwarm, port, {hostname, ssl}) {
  assert(Number.isInteger(port), 'Not a valid port number provided.')
  server = Hapi.server({
    port,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  })
  await server.register(WebSocketPlugin)

  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      return "Hi! I'm hyperwell, a Web Annotation P2P gateway."
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
          denormalizeAnnotation(hostname, docUrl, annotation, {
            port,
            ssl,
          })
        )
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'POST',
    path: '/annotations/subscribe/{container}/',
    config: {
      plugins: {
        websocket: {
          only: true,
          initially: true,
          autoping: 30 * 1000,
        },
      },
    },
    handler: async request => {
      let {ws, initially} = request.websocket()
      if (!initially) {
        return Boom.badRequest()
      }

      const docUrl = decodeDocUrl(request.params.container)
      const subscription = new Subscription()
      subscription.on('change', ({inserted, changed, deleted}) => {
        ws.send(
          JSON.stringify({
            inserted: inserted.map(annotation =>
              denormalizeAnnotation(hostname, docUrl, annotation, {
                port,
                ssl,
              })
            ),
            changed: changed.map(annotation =>
              denormalizeAnnotation(hostname, docUrl, annotation, {
                port,
                ssl,
              })
            ),
            deleted: deleted.map(annotation =>
              denormalizeAnnotation(hostname, docUrl, annotation, {
                port,
                ssl,
              })
            ),
          })
        )
      })

      ws.on('close', () => subscription.close())

      await backendSwarm.subscribeToAnnotations(docUrl, subscription)
      await new Promise(resolve => subscription.on('close', resolve))
      return ''
    },
  })

  server.route({
    method: 'GET',
    path: '/annotations/{container}/{id}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)

      try {
        const annotation = await backendSwarm.getAnnotation(
          docUrl,
          request.params.id
        )
        return denormalizeAnnotation(hostname, docUrl, annotation, {
          port,
          ssl,
        })
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
          `${ssl ? 'https' : 'http'}://${hostname}${
            port !== 80 ? `:${port}` : ''
          }/annotations/${encodeDocUrl(docUrl)}/${annotationId}`
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
          normalizeAnnotation(hostname, docUrl, annotation, {port, ssl})
        )
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'DELETE',
    path: '/annotations/{container}/{id}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)
      try {
        await backendSwarm.deleteAnnotation(docUrl, request.params.id)
        return h.code(204)
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'PUT',
    path: '/annotations/announce',
    handler: async request => {
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
