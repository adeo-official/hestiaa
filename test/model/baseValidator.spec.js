const expect = require('expect.js')
const indicative = require('indicative')
const sinon = require('sinon').sandbox.create()
const BaseValidator = require('../../lib/model/baseValidator')

describe('model/BaseValidator', () => {
  afterEach(function () {
    sinon.restore()
  })

  it('Should auto-register custom validators', async () => {
    const customValidatorName = 'dateString'
    await indicative.validate({'attr': '2018-01-12'}, {'attr': customValidatorName}) // error if unknown
  })

  it('Should auto-register custom sanitizors', async () => {
    const customSanitizorName = 'toIntOptional'
    await indicative.sanitize({'attr': '42'}, {'attr': customSanitizorName}) // error if unknown
  })

  it('Should inject "_id: toObjectId" if no _id sanitizer was specified', async () => {
    let indicativeSanitizeStub = sinon.stub(indicative, 'sanitize')
    let sanitizationsStub = sinon.stub(BaseValidator.prototype, 'sanitizations')

    sanitizationsStub.returns({foo: 'scape'})
    await new BaseValidator().sanitize({foo: 'bar'})

    expect(indicativeSanitizeStub.withArgs(
      {foo: 'bar'},
      {_id: 'toObjectId', foo: 'scape'}
    ).called).to.be(true)
  })

  it('Should not alter _id sanitizer if it was specified', async () => {
    let indicativeSanitizeStub = sinon.stub(indicative, 'sanitize')
    let sanitizationsStub = sinon.stub(BaseValidator.prototype, 'sanitizations')

    sanitizationsStub.returns({_id: 'to_int', foo: 'scape'})
    await new BaseValidator().sanitize({foo: 'bar'})

    expect(indicativeSanitizeStub.withArgs(
      {foo: 'bar'},
      {_id: 'to_int', foo: 'scape'}
    ).called).to.be(true)
  })
})
