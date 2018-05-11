const Cryptographer = require('../../lib/utils/cryptographer')
const expect = require('expect.js')
const sinon = require('sinon').sandbox.create()

describe('utils/Cryptographer', () => {
  beforeEach(() => {
    if (!process.env.APP_KEY) {
      process.env.APP_KEY = '' // initialize
    }

    sinon.stub(process.env, 'APP_KEY').value('secret_app_key_123')
  })

  it('Should encrypt string', async () => {
    let input = 'some human readable string'
    let encrypted = await Cryptographer.encrypt(input)

    expect(encrypted).not.to.be(input)
  })

  it('Should decrypt encrypted string', async () => {
    let expected = 'some human readable string'
    let encrypted = await Cryptographer.encrypt(expected)
    let result = await Cryptographer.decrypt(encrypted)

    expect(result).to.be(expected)
  })

  it('Should not decrypt non encrypted string', async () => {
    let expected = 'some human readable string'
    let error

    try {
      await Cryptographer.decrypt(expected)
    } catch (err) {
      error = err
    }

    expect(error).to.be.a(Error)
  })

  it('Should not encrypt string twice', async () => {
    let input = 'some human readable string'
    let encrypted = await Cryptographer.encrypt(input)
    let encryptedTwice = await Cryptographer.encrypt(encrypted)

    expect(encryptedTwice).to.be.equal(encrypted)
  })

  it('Should hash string (non reversable)', async () => {
    let input = 'user input'
    let hashed = await Cryptographer.hash(input)
    let decrypted
    try {
      // This should not work. That's is the point of the hash
      decrypted = await Cryptographer.decrypt(hashed)
    } catch (err) {
      decrypted = err
    }

    expect(hashed).to.not.be.equal(input)
    expect(decrypted).to.not.be.equal(hashed)
  })

  it('Should hash with salt to avoid dictionary attacks', async () => {
    // The following is the sha512 hash for "password"
    let hashForPassword = 'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'

    expect(await Cryptographer.hash('password')).to.not.eql(hashForPassword)
  })

  it('Should ensure consistent hash and salt algorithm', async () => {
    // To make sure that the salt algorithm will not change. Since it's
    // change would break the matching capabilities off all passwords
    // hashed previously ⚠
    expect(await Cryptographer.hash('secret123')).to.eql('767a426b17669278c7bc3461bc93da2a77dbe5f198e9c8e7e85037cb1b595dee83c01c703c4a252de6ff1afe90d8fa563fae2f8e9adfcf614ff8d0f9058bebb6')
    expect(await Cryptographer.hash('foobar@_42_2018')).to.eql('6285214d264ce229f02b80bcde83323af496da970eb46b6e19f37a7ef11dff2f5cdc480fbab38818e634549c85d3dd51ca3bc8dfc471de51bbaebc3ad66db9f5')
  })

  it('Should be able to check if hash matches', async () => {
    let input = 'user input'
    let badInput = 'non matching input'
    let hash = await Cryptographer.hash(input)
    expect(await Cryptographer.matchWithHash(input, hash)).to.be(true)
    expect(await Cryptographer.matchWithHash(badInput, hash)).to.be(false)
  })
})
