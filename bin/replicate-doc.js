#!/usr/bin/env node
const {Repo} = require('hypermerge');
const Hyperswarm = require('hyperswarm');
const createStore = require('../lib/repoStore');

async function main() {
  const repoStore = await createStore();
  const repoConf = repoStore.repos[0];
  const {id} = repoConf;

  console.log(`Reading repository with id: ${id}`);
  const repo = new Repo({
    path: `.data/${id}`,
    memory: true,
  });

  repo.setSwarm(Hyperswarm());
  console.log('Joined swarm.');

  await new Promise(resolve => {
    repo.doc(repoConf.docs[0], state => {
      console.log(state);
      resolve();
    });
  });
}

main();
