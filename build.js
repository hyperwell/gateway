const fs = require('fs')
const {parse: parsePath} = require('path')
const mkdirp = require('mkdirp')
const browserify = require('browserify')
const sanitizeManifest = require('browserify-package-json')
const parseArgs = require('minimist')

const {debug, out: outputPath} = parseArgs(process.argv.slice(2), {
  string: ['outputPath'],
  boolean: ['debug'],
  alias: {
    debug: ['d'],
    out: ['o'],
  },
  default: {
    debug: false,
    out: undefined,
  },
})

const babelConf = JSON.parse(fs.readFileSync(`${__dirname}/.babelrc`, 'utf8'))

if (outputPath !== undefined) {
  mkdirp.sync(parsePath(outputPath).dir)
}
const target =
  outputPath !== undefined ? fs.createWriteStream(outputPath) : process.stdout

const bundler = browserify(`${__dirname}/browser-bundle.js`, {
  standalone: 'from-me-to-you',
  debug,
})
bundler
  .transform({global: true}, sanitizeManifest)
  .transform('babelify', {
    ...babelConf,
    global: true,
    only: [
      /^(?:.*\/node_modules\/(?:hyperswarm|hyperswarm-ws|hyperswarm-proxy|debug)\/|(?!.*\/node_modules\/)).*$/,
    ],
  })
  .bundle()
  .pipe(target)
