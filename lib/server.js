const assert = require('assert')
const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const WebSocketPlugin = require('hapi-plugin-websocket')
const etag = require('etag')
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
  debug(err)
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

async function createServer(backendSwarm, port, {host, ssl}) {
  assert(Number.isInteger(port), 'Not a valid port number provided.')
  server = Hapi.server({
    port,
    router: {
      stripTrailingSlash: true,
    },
    routes: {
      cors: {
        origin: ['*'],
        exposedHeaders: ['link', 'allow', 'etag'],
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
    path: '/annotations/{container}',
    handler: async (request, h) => {
      const page = request.query.page
        ? Number.parseInt(request.query.page)
        : null
      const iris = request.query.iris === '1'
      if (page !== null && page !== 0) {
        return Boom.notFound()
      }

      const docUrl = decodeDocUrl(request.params.container)
      try {
        const annotations = await backendSwarm.getAnnotations(docUrl)
        const denormalizedAnnotations = annotations.map(annotation =>
          denormalizeAnnotation(host, docUrl, annotation, {ssl})
        )

        if (page !== null) {
          const container = {
            '@context': 'http://www.w3.org/ns/anno.jsonld',
            id: 'http://example.org/annotations/?iris=0&page=0',
            type: 'AnnotationPage',
            partOf: {
              id: 'http://example.org/annotations/?iris=0',
              total: denormalizedAnnotations.length,
              modified: '2016-07-20T12:00:00Z',
            },
            startIndex: 0,
            items: denormalizedAnnotations,
          }

          const response = h.response(container)
          response.type(
            'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"'
          )
          response.header('allow', 'HEAD, GET, OPTIONS')

          return response
        }

        const container = {
          '@context': [
            'http://www.w3.org/ns/anno.jsonld',
            'http://www.w3.org/ns/ldp.jsonld',
          ],
          id: 'http://example.org/annotations/?iris=1',
          type: ['BasicContainer', 'AnnotationCollection'],
          total: denormalizedAnnotations.length,
          modified: '2016-07-20T12:00:00Z',
          label: 'tbc',
          first: 'http://example.org/annotations/?iris=1&page=0',
          last: 'http://example.org/annotations/?iris=1&page=42',
        }

        const response = h.response(container)
        response.header('link', [
          '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
          '<http://www.w3.org/TR/annotation-protocol/>; rel="http://www.w3.org/ns/ldp#constrainedBy"',
        ])
        response.header(
          'Accept-Post',
          'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"'
        )
        response.type(
          'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"'
        )
        response.header('allow', 'HEAD, GET, POST, OPTIONS')
        response.etag(etag(JSON.stringify(container)))

        return response
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'POST',
    path: '/annotations/subscribe/{container}',
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
              denormalizeAnnotation(host, docUrl, annotation, {ssl})
            ),
            changed: changed.map(annotation =>
              denormalizeAnnotation(host, docUrl, annotation, {ssl})
            ),
            deleted: deleted.map(annotation =>
              denormalizeAnnotation(host, docUrl, annotation, {ssl})
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
        const denormalizedAnnotations = denormalizeAnnotation(
          host,
          docUrl,
          annotation,
          {ssl}
        )
        const response = h.response(denormalizedAnnotations)
        response.etag(etag(JSON.stringify(denormalizedAnnotations)))
        response.type(
          'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"'
        )
        response.header('allow', 'OPTIONS,HEAD,GET,PUT,DELETE')
        response.header(
          'link',
          '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
        )

        return response
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'POST',
    path: '/annotations/{container}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)
      const annotation = request.payload

      try {
        const annotationId = await backendSwarm.createAnnotation(
          docUrl,
          annotation
        )
        return h.redirect(
          `${ssl ? 'https' : 'http'}://${host}/annotations/${encodeDocUrl(
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
          normalizeAnnotation(host, docUrl, annotation, {ssl})
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
        return h.response().code(204)
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'POST',
    path: '/annotations/batch/{container}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)
      const annotations = request.payload

      try {
        const insertedAnnotations = await backendSwarm.createAnnotationsBatch(
          docUrl,
          annotations
        )
        return insertedAnnotations.map(annotation =>
          denormalizeAnnotation(host, docUrl, annotation, {ssl})
        )
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'PUT',
    path: '/annotations/batch/{container}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)
      const annotations = request.payload

      try {
        const changedAnnotations = await backendSwarm.updateAnnotationsBatch(
          docUrl,
          annotations.map(annotation =>
            normalizeAnnotation(host, docUrl, annotation, {ssl})
          )
        )
        return changedAnnotations.map(annotation =>
          denormalizeAnnotation(host, docUrl, annotation, {ssl})
        )
      } catch (err) {
        return handleError(err)
      }
    },
  })

  server.route({
    method: 'DELETE',
    path: '/annotations/batch/{container}',
    handler: async (request, h) => {
      const docUrl = decodeDocUrl(request.params.container)
      const annotations = request.payload

      try {
        await backendSwarm.deleteAnnotationsBatch(
          docUrl,
          annotations.map(annotation =>
            normalizeAnnotation(host, docUrl, annotation, {ssl})
          )
        )
        return {
          deleted: true,
          error: null,
        }
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
