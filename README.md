# From Me to You: Peer-to-Peer Collaboration Infrastructure with Linked Data Annotations

Implementation of a peer-to-peer (P2P) system that leverages collaboration, local-first principles, and more on [W3C Web Annotations](https://www.w3.org/TR/annotation-model/). More on that: https://kassel.works/thesis

## Architecture

This is a work-in-progress and more elaborate documentation will follow. A buzzword-y summary could be: Annotations are organized in notebooks, one notebook per resource (a `target` in Web Annotation speak). These notebooks are stored in a JSON-based CRDT, [Hypermerge](https://github.com/automerge/hypermerge). The replication of these CRDTs to other peers happens via [Hyperswarm](https://github.com/hyperswarm/hyperswarm), a Kademlia DHT.

![From Me to You Architecture](/architecture.jpg)

Discovery of related work on a particular resource also happens via Hyperswarm, as peers join the respective swarms and announce themselves as connection targets. To be _somewhat_ consistent with the [Web Annotation Protocol specification](https://www.w3.org/TR/annotation-protocol/), a bridge network is then created for distribution of documents to _clients_ (think a browser-based application). Communication over this bridge networks happens via Hyperswarm, too, but with a HTTP-ish protocol, as Hypermerge [doesn't (and likely won't) support the web platform](https://github.com/automerge/hypermerge/issues/3). Browsers join the bridge network [via WebSocket gateways](https://github.com/falafeljan/hyperswarm-ws).

## Usage

Start the replication client via `node . [-v]`. Will (for now, for testing purposes) create a new repository and new document if none exist. They are stored on the local disk, with data stored in `.data` and repository information stored in `repos.json`. Provide `-v` to run a volatile, in-memory node for testing things out quickly and temporarily.

Execute all commands with `DEBUG=me2u*` to receive debug information.

### Development Scripts

- `node scripts/announcement-test.js <target> <doc-url>` Test the distribution announcement functionality. Will join client nodes in pretending to provide a particular document for a particular JSON-LD target.
- `node scripts/replicate-doc.js <doc-url> [-e]` Will start a volatile client, but add an already existing document to the repository. If `-e` (edit) provided, the specified document will be edited with a random number variable added.
- `node scripts/bridge-test.js <doc-url>` Will attempt to load a document and related docs via the bridge network from a running client.
- `node scripts/console.js <doc-url>` Open a development console that connects to the distribution swarm of a given document. Execute arbitrary requests of the HTTP-ish protocol: `<method> <path>` (e.g., `get /annotations.jsonld`).

## API

(tbc)

## License

[MIT License](/LICENSE), see `./LICENSE`.
