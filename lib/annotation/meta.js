const {parse: parseUrl} = require('url')

const pathPattern = /^(\/\w+)?\/annotations\/(\w+)\.jsonld$/

const parseId = url => {
  const {protocol, pathname} = parseUrl(url)
  const results = pathname.match(pathPattern)
  if (results !== null) {
    if (
      (results[1] && protocol !== 'hypermerge:') ||
      (!results[1] && protocol === 'hypermerge:')
    ) {
      return null
    } else if (results[1]) {
      return {
        docId: results[1].substr(1),
        annotationId: results[2],
      }
    }
    return {
      docId: null,
      annotationId: results[2],
    }
  }
  return null
}

module.exports = {parseId}
