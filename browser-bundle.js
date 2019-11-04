require('core-js/stable')
require('regenerator-runtime/runtime')

const {createRequestSwarm} = require('./lib/request/browser-swarm')
module.exports = {createRequestSwarm}
