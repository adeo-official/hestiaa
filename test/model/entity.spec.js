const sinon = require('sinon').sandbox.create()
const expect = require('expect.js')
const Mongorito = require('mongorito')
const Entity = require('../../lib/model/entity')
const ValidationError = require('../../lib/errors/validationError')
const ResourceNotFoundError = require('../../lib/errors/resourceNotFoundError')

describe('model/Entity', function () {
  afterEach(function () {
    sinon.restore()
  })

  it('Should sanitize and validate when saving', async function () {
    let entity = new Entity({})
    let validatorMock = {
      sanitize: () => { return {} },
      getErrors: () => { return [] }
    }

    let mongoritoSaveStub = sinon.stub(Mongorito.Model.prototype, 'save') // not to touch the DB ;)
    let sanitizeSpy = sinon.spy(entity, 'sanitize')
    let isValidSpy = sinon.spy(entity, 'isValid')
    sinon.stub(entity, '__getValidator').returns(validatorMock)

    // Execute
    await entity.save()

    // Verify
    expect(sanitizeSpy.callCount).to.be(1)
    expect(isValidSpy.callCount).to.be(1)
    expect(mongoritoSaveStub.calledOnce).to.be(true)
  })

  it('Should sanitize when validating', async function () {
    let entity = new Entity({})
    let validatorMock = {
      sanitize: () => { return {} },
      getErrors: () => { return [] }
    }

    sinon.stub(entity, '__getValidator').returns(validatorMock)
    let sanitizeSpy = sinon.spy(entity, 'sanitize')

    // Execute
    await entity.isValid()

    // Verify
    expect(sanitizeSpy.callCount).to.be(1)
  })

  it('Should embed new entity if valid', async function () {
    let parent = new Entity({})
    let child = new Entity({})

    expect(child.get('_id')).not.to.be.ok()

    let isValidStub = sinon.stub(child, 'isValid')
    isValidStub.resolves(true) // No validation errors

    await parent.embed('children', child)

    expect(isValidStub.called).to.be(true)
    expect(child.get('_id')).to.be.ok()
  })

  it('Should NOT embed entity if INvalid', async function () {
    let parent = new Entity({})
    let child = new Entity({})

    expect(child.get('_id')).not.to.be.ok()

    let raisedError
    let isValidStub = sinon.stub(child, 'isValid')

    isValidStub.rejects(new ValidationError('invalid child')) // No validation errors

    try {
      await parent.embed('children', child)
    } catch (err) {
      raisedError = err
    }

    expect(raisedError).to.be.a(ValidationError)
  })

  it('Should embed existing entity if valid', async function () {
    // given
    let parent = new Entity({})
    let child = new Entity({})

    expect(child.get('_id')).not.to.be.ok()

    let isValidStub = sinon.stub(child, 'isValid')
    isValidStub.resolves(true) // No validation errors

    await parent.embed('children', child)

    expect(parent.get('children').length).to.be(1)
    let id = child.get('_id')
    // when
    child.set('name', 'a new name for the same equipment')
    await parent.embed('children', child)
    // then
    expect(parent.get('children').length).to.be(1)
    expect(child.get('_id')).to.be(id)
  })

  it('Should NOT embed existing entity if INvalid', async function () {
    // given
    let parent = new Entity({})
    let child = new Entity({name: 'Initial name'})

    expect(child.get('_id')).not.to.be.ok()

    let isValidStub = sinon.stub(child, 'isValid')
    isValidStub.resolves(true) // No validation errors
    isValidStub.onSecondCall().rejects(new ValidationError('Should not work on update')) // No validation errors

    await parent.embed('children', child)

    expect(parent.get('children').length).to.be(1)
    // when
    child = new Entity({_id: child.get('_id'), name: 'a new name for the same equipment'})
    isValidStub = sinon.stub(child, 'isValid')
    isValidStub.rejects(new ValidationError('Should not work on update')) // No validation errors

    let raisedError
    try {
      await parent.embed('children', child)
    } catch (err) {
      raisedError = err
    }
    // then
    expect(raisedError).to.be.a(ValidationError)
    expect(parent.get('children').length).to.be(1)
    expect(parent.get('children')[0].get('name')).to.be('Initial name')
  })

  it('Should NOT embed entity if incorrect id', async function () {
    // given
    let parent = new Entity({})
    let child = new Entity({name: 'Initial name'})

    expect(child.get('_id')).not.to.be.ok()

    let isValidStub = sinon.stub(child, 'isValid')
    isValidStub.resolves(true) // No validation errors
    await parent.embed('children', child)

    expect(parent.get('children').length).to.be(1)
    // when
    child = new Entity({_id: 'an incorrect id', name: 'a new name for the same equipment'})
    isValidStub = sinon.stub(child, 'isValid')
    isValidStub.resolves(true) // No validation errors

    let raisedError
    try {
      await parent.embed('children', child)
    } catch (err) {
      raisedError = err
    }
    // then
    expect(raisedError).to.be.a(ResourceNotFoundError)
    expect(parent.get('children').length).to.be(1)
    expect(parent.get('children')[0].get('name')).to.be('Initial name')
  })

  it('Should retrieve an specific embeded entity', async function () {
    let parent = new Entity({})
    let testData = [
      {name: 'foo', id: null, entity: null},
      {name: 'bar', id: null, entity: null},
      {name: 'baz', id: null, entity: null},
      {name: 'doe', id: null, entity: null}
    ]

    for (var childTestData of testData) {
      let child = new Entity({name: childTestData.name})
      sinon.stub(child, 'isValid').resolves(true)
      await parent.embed('childrens', child)

      childTestData.entity = child // stores entity for assertion
      childTestData.id = child.get('_id')
    }

    expect(parent.getEmbeded('childrens', testData[1].id)).to.eql(testData[1].entity)
    expect(parent.getEmbeded('childrens', testData[3].id)).to.eql(testData[3].entity)
    expect(parent.getEmbeded).withArgs('childrens', 'nonExistantId').to.throwException()
  })
  it('Should clear all fields of entity', async function () {
    let entity = new Entity({'_id': '1234567', 'name': 'Foo', 'age': 12})

    await entity.clear()
    expect(entity.store.getState().fields).to.eql({'_id': '1234567'})
    expect(entity.store.getState().unset).to.eql(['name', 'age'])
  })
})
