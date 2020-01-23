# Hyperwell Gateway

Implementation of a peer-to-peer (P2P) system that leverages collaboration, local-first principles, and more on [W3C Web Annotations](https://www.w3.org/TR/annotation-model/). The system provides software for local nodes that store annotations, as well as a gateway server that implements the [W3C Web Annotation Protocol](https://www.w3.org/TR/annotation-protocol/).

More on that: https://kassel.works/thesis

**Important**: This is alpha software for research. Your annotations will be available publicly and accessible without authentication.

## Usage

Start a gateway with `npm start` or `./bin/server.js`. The gateway accepts the following arguments:

- `--port <number>` (`-p`): The port number to listen on. Defaults to `3000`. Example: `--port 8080`.
- `--host <hostname>`: The public hostname. Defaults to `localhost:3000`. Example: `--host www.example.com:8080`
- `--ssl` (`-s`): The gateway is being served via SSL. This will not make the gateway actually terminate HTTPS requests (it listens for standard HTTP requests), but will transform annotation IDs accordingly, using the `https:` scheme. Defaults to `false` (not set).

(tbc).

## License

[MIT License](/LICENSE), see `./LICENSE`.
