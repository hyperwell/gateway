#!/usr/bin/env node
const Hyperswarm = require('hyperswarm');
const crypto = require('crypto');
const {createRequest} = require('../lib/http-request');
const {createStore} = require('../lib/repo-store');

async function main() {
  const repoStore = await createStore();
  const docUrl = repoStore.repos[0].docs[0];

  const swarm = Hyperswarm();

  console.log(`Joining second swarm: annotations-${docUrl}`);
  const topic = crypto
    .createHash('sha256')
    .update(`annotations-${docUrl}`)
    .digest();

  swarm.join(topic, {
    lookup: true,
    announce: false,
  });

  await new Promise(resolve => {
    swarm.once('connection', async socket => {
      await createRequest(
        socket,
        `/annotations/${encodeURIComponent(docUrl)}.jsonld`
      );
      resolve();
    });
  });

  console.log('Leaving swarm...');
  swarm.destroy();
}

main();
