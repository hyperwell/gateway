const Hyperswarm = require('hyperswarm');
const pathMatch = require('path-match');
const {parse: parseUrl} = require('url');
import sha256 from './sha256';
const {parseRequest} = require('./http-request');

const routeMatcher = pathMatch({
  sensitive: true,
  strict: false,
  end: false,
});

const createHandler = (url, handler) => ({
  matchUrl: routeMatcher(url),
  handler,
});

function handleConnection(handlers) {
  return socket => {
    const parser = parseRequest(socket);

    parser.on('request', async (req, res) => {
      for (const {matchUrl, handler} of handlers) {
        const params = matchUrl(parseUrl(req.url).pathname);

        if (params !== false) {
          req.params = params;
          await handler(req, res);

          return;
        }
      }

      req.statusCode = 404;
      res.end('Not Found');
    });

    parser.once('error', err => {
      console.error(err);
    });
  };
}

function serveSwarm(repo, docUrl) {
  const swarm = Hyperswarm();

  console.log(`Joining second swarm: annotations-${docUrl}`);
  const topic = sha256(`annotations-${docUrl}`);

  swarm.join(topic, {
    lookup: true,
    announce: true,
  });

  const annotationHandler = createHandler(
    '/annotations/:id.jsonld',
    async (req, res) => {
      console.log(req.method, req.url);

      const state = await repo.doc(docUrl);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/ld+json');
      res.end(
        JSON.stringify(
          {
            state,
          },
          null,
          2
        )
      );
    }
  );

  swarm.on('connection', handleConnection([annotationHandler]));

  return async () => new Promise(resolve => swarm.destroy(() => resolve()));
}

module.exports = {serveSwarm};
