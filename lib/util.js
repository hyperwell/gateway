const encodeDocUrl = docUrl => Buffer.from(docUrl).toString('hex')
const decodeDocUrl = encodedDocUrl =>
  Buffer.from(encodedDocUrl, 'hex').toString()

function normalizeId(host, docUrl, annotationId, opts = {}) {
  const ssl = opts.ssl || false
  const pattern = new RegExp(
    `^${ssl ? 'https' : 'http'}:\/\/${host}\/annotations\/${encodeDocUrl(
      docUrl
    )}\/([0-9a-z-]+)$`
  )
  // FIXME: validate annotation schema prior to normalizing ID
  const matches = annotationId.match(pattern)
  return !matches ? null : matches[1]
}

function normalizeAnnotation(host, docUrl, annotation, opts = {}) {
  return {
    ...annotation,
    id: normalizeId(host, docUrl, annotation.id, opts),
  }
}

const denormalizeAnnotation = (host, docUrl, annotation, opts = {}) => {
  const ssl = opts.ssl || false
  // FIXME: validate annotation schema prior to denormalizing ID
  return {
    ...annotation,
    id: `${ssl ? 'https' : 'http'}://${host}/annotations/${encodeDocUrl(
      docUrl
    )}/${annotation.id}`,
  }
}

module.exports = {
  normalizeId,
  normalizeAnnotation,
  denormalizeAnnotation,
  encodeDocUrl,
  decodeDocUrl,
}
