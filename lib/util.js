function waitForReady(emitter) {
  return new Promise(resolve => emitter.once('ready', resolve))
}

module.exports = {waitForReady}
