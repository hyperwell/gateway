const pathMatch = require('path-match')
const {parse: parseUrl} = require('url')
const {parseRequest} = require('./http-request')

const routeMatcher = pathMatch({
  sensitive: true,
  strict: false,
  end: false,
})

const createHandler = (url, handler) => ({
  matchUrl: routeMatcher(url),
  handler,
})

function handleRequests(handlers) {
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
  createHandler,
  handleRequests,
}
