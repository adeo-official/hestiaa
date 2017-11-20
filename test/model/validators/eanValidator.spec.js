const expect = require('expect.js')
const validate = require('../../../lib/model/validators/eanValidator').validate

describe('model/validators/eanValidator', () => {
  const MSG = 'THE ERROR MESSAGE'
  const CALLED = x => {}
  const IGNORED = x => expect().fail(x)

  it('Valid value is resolved', () => {
    validate('01234567', MSG, CALLED, IGNORED)
    validate('012345678901', MSG, CALLED, IGNORED)
  })

  it('Invalid value is rejected', () => {
    validate('', MSG, IGNORED, CALLED)
    validate('azerty', MSG, IGNORED, CALLED)
    validate('???', MSG, IGNORED, CALLED)
  })
})
