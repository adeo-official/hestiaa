const sinon = require('sinon').sandbox.create()
const expect = require('expect.js')
const MongoritoUtils = require('../../lib/utils/mongoritoUtils')
const CurrentUser = require('../../lib/utils/currentUser')
const BaseValidator = require('../../lib/model/baseValidator')
const Entity = require('../../lib/model/entity')

class SampleValidator extends BaseValidator {
  sanitizations () {
    return {}
  }

  validations () {
    return {}
  }
}

class Box extends Entity {
  __getValidator () {
    return new SampleValidator()
  }
}

Box.use(MongoritoUtils.traceabilityPlugin)

describe('utils/mongoritoUtils', () => {
  afterEach(() => sinon.restore())

  const ME = 'me'
  const OTHER = 'other'
  const NOW = new Date()
  const AFTER = new Date(NOW.getTime() + 99999999)
  let currentUserGetValueStub
  let nowStub
  beforeEach('Mock Date', () => {
    currentUserGetValueStub = sinon.stub(CurrentUser, 'getValue').returns(ME)
    nowStub = sinon.stub(MongoritoUtils, 'now').returns(NOW)
  })

  let fillFieldsSpy
  beforeEach('Spy #_fillFields', () => restoreAndSpyFillFields())

  function restoreAndSpyFillFields () {
    if (fillFieldsSpy) {
      fillFieldsSpy.restore()
    }
    fillFieldsSpy = sinon.spy(MongoritoUtils, '_fillFields')
  }

  let insertStub
  let updateStub
  beforeEach('Stub Entity#save()', () => {
    let getCollectionFake = {
      insert: () => {},
      update: () => {}
    }
    insertStub = sinon.stub(getCollectionFake, 'insert').resolves({ops: [{_id: '000000000000000000000000'}]})
    updateStub = sinon.stub(getCollectionFake, 'update').resolves({})
    sinon.stub(Box, 'getCollection').resolves(getCollectionFake)
  })

  describe('#traceabilityPlugin', () => {
    it('#save() for "insert" should fill 4 fields', async () => {
      let entity = new Box({foo: 'bar'})
      await entity.save()

      // current entity
      expect(entity.get('createdAt')).to.eql(NOW)
      expect(entity.get('updatedAt')).to.eql(NOW)
      expect(entity.get('createdBy')).to.eql(ME)
      expect(entity.get('updatedBy')).to.eql(ME)
      // sent to database
      expect(insertStub.called).to.be(true)
    })

    it('#save() for "update" should fill only 2 "updated" fields', async () => {
      let entity = new Box({foo: 'bar'})
      await entity.save()

      nowStub.reset()
      nowStub.returns(AFTER)

      currentUserGetValueStub.restore()
      sinon.stub(CurrentUser, 'getValue').returns(OTHER)

      entity.set('description', 'any')
      await entity.save()

      // current entity
      expect(entity.get('createdAt')).to.eql(NOW)
      expect(entity.get('updatedAt')).to.eql(AFTER)
      expect(entity.get('createdBy')).to.eql(ME)
      expect(entity.get('updatedBy')).to.eql(OTHER)
      // sent to database
      expect(updateStub.called).to.be(true)
    })
  })
})
