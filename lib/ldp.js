const Boom = require('@hapi/boom')
const etag = require('etag')

class PagedCollection {
  constructor(getPage, notebookInfo, total, pageSize) {
    if (Array.isArray(getPage)) {
      const items = getPage
      this._getPage = () => items
      this.total = items.length
      this.pageSize = Infinity
    } else {
      this._getPage = getPage
      this.total = total
      this.pageSize = pageSize
    }
    this.notebookInfo = notebookInfo
  }

  getPage(pageNumber) {
    return this._getPage(pageNumber, this.pageSize)
  }

  get lastPage() {
    return this.pageSize === Infinity
      ? 0
      : Math.floor(this.total / this.pageSize)
  }
}

function createPage(h, collection, pageNumber, iris) {
  if (pageNumber > collection.lastPage) {
    return Boom.notFound()
  }

  const items = collection.getPage(pageNumber)
  const containerUrl = collection.notebookInfo.getContainerUrl()
  const page = {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id: `${containerUrl}/?page=${pageNumber}&iris=${iris ? 1 : 0}`,
    type: 'AnnotationPage',
    partOf: {
      id: `${containerUrl}/?iris=${iris ? 1 : 0}`,
      total: collection.total,
      modified: '2016-07-20T12:00:00Z',
    },
    startIndex: pageNumber === 0 ? 0 : collection.pageSize * pageNumber,
    items: iris ? items.map(item => item.id) : items,
  }

  const response = h.response(page)
  response.type(
    'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"'
  )
  response.header('allow', 'HEAD, GET, OPTIONS')

  return response
}

function createContainer(h, collection, iris) {
  const containerUrl = collection.notebookInfo.getContainerUrl()
  const container = {
    '@context': [
      'http://www.w3.org/ns/anno.jsonld',
      'http://www.w3.org/ns/ldp.jsonld',
    ],
    id: `${containerUrl}/?iris=${iris ? 1 : 0}`,
    type: ['BasicContainer', 'AnnotationCollection'],
    total: collection.total,
    modified: '2016-07-20T12:00:00Z',
    label: 'tbd',
    first: `${containerUrl}/?iris=${iris ? 1 : 0}&page=0`,
    ...(collection.lastPage > 0 && {
      last: `${containerUrl}/?iris=${iris ? 1 : 0}&page=${collection.lastPage}`,
    }),
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
}

function wrapResource(h, annotation) {
  const response = h.response(annotation)
  response.etag(etag(JSON.stringify(annotation)))
  response.type(
    'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"'
  )
  response.header('allow', 'OPTIONS,HEAD,GET,PUT,DELETE')
  response.header('link', '<http://www.w3.org/ns/ldp#Resource>; rel="type"')

  return response
}

module.exports = {PagedCollection, createPage, createContainer, wrapResource}
