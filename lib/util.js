const encodeDocUrl = docUrl => Buffer.from(docUrl).toString('hex')
const decodeDocUrl = encodedDocUrl =>
  Buffer.from(encodedDocUrl, 'hex').toString()

function normalizeId(hostname, docUrl, annotationId, opts = {}) {
  const port = opts.port || null
  const ssl = opts.ssl || false
  const pattern = new RegExp(
    `^${ssl ? 'https' : 'http'}:\/\/${hostname}${
      port ? `:${port}` : ''
    }\/annotations\/${encodeDocUrl(docUrl)}\/([0-9a-z-]+)$`
  )
  // FIXME: validate annotation schema prior to normalizing ID
  const matches = annotationId.match(pattern)
  return !matches ? null : matches[1]
}

function normalizeAnnotation(hostname, docUrl, annotation, opts = {}) {
  return {
    ...annotation,
    id: normalizeId(hostname, docUrl, annotation.id, opts),
  }
}

const denormalizeAnnotation = (hostname, docUrl, annotation, opts = {}) => {
  const port = opts.port || null
  const ssl = opts.ssl || false
  // FIXME: validate annotation schema prior to denormalizing ID
  return {
    ...annotation,
    id: `${ssl ? 'https' : 'http'}://${hostname}${
      port ? `:${port}` : ''
    }/annotations/${encodeDocUrl(docUrl)}/${annotation.id}`,
  }
}

module.exports = {
  normalizeId,
  normalizeAnnotation,
  denormalizeAnnotation,
  encodeDocUrl,
  decodeDocUrl,
}
