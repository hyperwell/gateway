const pathMatch = require('path-match')
const {parse: parseUrl} = require('url')
const {parseRequest} = require('./http-request')

const routeMatcher = pathMatch({
  sensitive: true,
  strict: false,
  end: false,
})

function handleRequests(routes) {
  const handlers = Object.entries(routes).map(([url, handler]) => ({
    matchUrl: routeMatcher(url),
    handler,
  }))

  return socket => {
    const parser = parseRequest(socket)

    parser.on('request', async (req, res) => {
      for (const {matchUrl, handler} of handlers) {
        const params = matchUrl(parseUrl(req.url).pathname)

        if (params !== false) {
          req.params = params
          await handler(req, res)

          return
        }
      }

      req.statusCode = 404
      res.end('Not Found')
    })

    parser.once('error', err => {
      console.error(err)
    })
  }
}

module.exports = {
  handleRequests,
}
