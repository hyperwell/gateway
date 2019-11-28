const assert = require('assert')

class AbstractSwarm {
  async getAnnotations(docUrl) {
    assert.fail('`swarm.getAnnotations needs to be implemented.')
  }

  async getAnnotation(docUrl, annotationId) {
    assert.fail('`swarm.getAnnotation needs to be implemented.')
  }

  async createAnnotation(docUrl) {
    assert.fail('`swarm.createAnnotation needs to be implemented.')
  }

  async updateAnnotation(docUrl, annotation) {
    assert.fail('`swarm.updateAnnotation needs to be implemented.')
  }

  async deleteAnnotation(docUrl, annotation) {
    assert.fail('`swarm.deleteAnnotation needs to be implemented.')
  }

  async subscribeToAnnotations(docUrl) {
    assert.fail('`swarm.subscribeToAnnotations needs to be implemented.')
  }

  async destroy() {
    assert.fail('`swarm.destroy needs to be implemented.')
  }
}

module.exports = {AbstractSwarm}
