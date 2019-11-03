# From Me to You: Peer-to-Peer Collaboration Infrastructure with Linked Data Annotations

Implementation of a peer-to-peer (P2P) system that leverages collaboration, local-first principles, and more on [W3C Web Annotations](https://www.w3.org/TR/annotation-model/). More on that: https://kassel.works/thesis

## Usage

Execute all commands with `DEBUG=me2u*` to receive debug information.

- `node . [-v]` Start the replication client. Will create a new repository and new document if none exist. They are stored on the local disk, with data stored in `.data` and repository information stored in `repos.json`. Provide `-v` to run a volatile, in-memory node for testing things out quickly and temporarily.
- `node scripts/announcement-test.js <target> <doc-url>` Test the distribution announcement functionality. Will join client nodes in pretending to provide a particular document for a particular JSON-LD target.
- `node scripts/replicate-doc.js <doc-url> [-e]` Will start a volatile client, but add an already existing document to the repository. If `-e` (edit) provided, the specified document will be edited with a random number variable added.
- `node scripts/bridge-test.js <doc-url>` Will attempt to load a document and related docs via the bridge network from a running client.
