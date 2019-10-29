const crypto = require('crypto')

module.exports = function sha256(input) {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest()
}
