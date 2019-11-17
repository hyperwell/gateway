const gatewayUrls = ['wss://hyperswarm-ws-gateway.kassel.works']

if (process.env.NODE_ENV !== 'production') {
  gatewayUrls.unshift('ws://localhost:4200')
}

module.exports = {gatewayUrls}
