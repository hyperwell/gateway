const fs = require('fs')
const browserify = require('browserify')

const babelConf = JSON.parse(fs.readFileSync(`${__dirname}/.babelrc`, 'utf8'))
const target =
  process.argv.length > 2
    ? fs.createWriteStream(process.argv[2])
    : process.stdout

browserify(`${__dirname}/browser-bundle.js`)
  .transform('babelify', {
    ...babelConf,
    global: true,
    only: [
      /^(?:.*\/node_modules\/(?:hyperswarm|hyperswarm-ws|hyperswarm-proxy|debug)\/|(?!.*\/node_modules\/)).*$/,
    ],
  })
  .bundle()
  .pipe(target)
