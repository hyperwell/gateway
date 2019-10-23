#!/usr/bin/env node
const {Repo} = require('hypermerge');
const Hyperswarm = require('hyperswarm');
const createStore = require('../lib/repo-store');

async function main() {
  const repoStore = await createStore();
  const repoConf = repoStore.repos[0];
  const {id} = repoConf;

  console.log(`Reading repository with id: ${id}`);
  const repo = new Repo({path: `${__dirname}/../.data/${id}`});

  repo.setSwarm(Hyperswarm());
  console.log('Joined swarm.');

  if (repoConf.docs.length === 0) {
    const url = repo.create({hello: 'world'});
    repo.doc(url, doc => {
      console.log(doc);
    });

    repoStore.addDoc(id, url);
  } else {
    console.log(`Watching doc: ${repoConf.docs[0]}`);

    const handles = await Promise.all(
      repoConf.docs.map(docUrl =>
        repo.watch(docUrl, () => console.log(`Update at: ${docUrl}`))
      )
    );

    process.on('SIGINT', () => {
      console.log('Closing watchers...');

      handles.forEach(handle => handle.close());
      repo.close();

      process.exit(0);
    });
  }
}

main();
