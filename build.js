const fs = require('fs')
const {parse: parsePath} = require('path')
const mkdirp = require('mkdirp')
const browserify = require('browserify')
const sanitizeManifest = require('browserify-package-json')

const babelConf = JSON.parse(fs.readFileSync(`${__dirname}/.babelrc`, 'utf8'))
const targetPath = process.argv.length > 2 ? process.argv[2] : null

if (targetPath !== null) {
  mkdirp.sync(parsePath(targetPath).dir)
}
const target =
  targetPath !== null ? fs.createWriteStream(process.argv[2]) : process.stdout

browserify(`${__dirname}/browser-bundle.js`, {standalone: 'from-me-to-you'})
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
