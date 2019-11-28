const ERROR_NOT_FOUND = 1
const ERROR_BAD_DOC = 2
const ERROR_BAD_REQUEST = 3

class SwarmError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }

  static badRequest(message) {
    return new SwarmError(ERROR_BAD_REQUEST, message)
  }

  static notFound(message) {
    return new SwarmError(ERROR_NOT_FOUND, message)
  }

  static badDoc(message) {
    return new SwarmError(ERROR_BAD_DOC, message)
  }
}

module.exports = {
  SwarmError,
  ERROR_NOT_FOUND,
  ERROR_BAD_DOC,
  ERROR_BAD_REQUEST,
}
