const crypto = require('crypto')

/**
 * Facade to handle encryption and decryption of strings based upon Node's
 * crypto to encrypt and decrypt values with a SALT. By default all values are
 * encrypted using aes-256-cbc algorithm.
 *
 * It uses the APP_KEY environment variable as the encryption key
 *
 * It also takes care that the same string will not be encrypted twice and also
 * throws an human readable error when trying to decrypt a non encrypted string
 */
class Cryptographer {
  /**
   * Encrypt the given string
   *
   * @param  {string} input
   * @return {Promise}
   */
  static encrypt (input) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.APP_KEY)

    if (/^[0-9a-f]{32,}$/g.test(input)) {
      return Promise.resolve(input)
    }

    return new Promise((resolve, reject) => {
      let encrypted = ''

      cipher.on('readable', () => {
        const data = cipher.read()
        if (data) { encrypted += data.toString('hex') }
      })
      cipher.on('end', () => {
        resolve(encrypted)
      })

      cipher.write(input)
      cipher.end()
    })
  }

  /**
   * Decript the given string
   *
   * @param  {string} input Encrypted string
   * @return {Promise}
   */
  static decrypt (input) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.APP_KEY)

    return new Promise((resolve, reject) => {
      let decrypted = ''

      decipher.on('readable', () => {
        const data = decipher.read()
        if (data) {
          decrypted += data.toString('utf8')
        }
      })
      decipher.on('end', () => {
        resolve(decrypted)
      })

      decipher.write(input, 'hex')
      try {
        decipher.end()
      } catch (err) {
        reject(new Error('Trying to decrypt non encrypted string'))
      }
    })
  }

  /**
   * Hashes the given string into a non-reversable string for safety reasons
   * @see https://en.wikipedia.org/wiki/Cryptographic_hash_function
   * @param {string} input
   * @return {string} Hashed string
   */
  static hash (input) {
    const hash = crypto.createHash('sha512')

    return new Promise((resolve, reject) => {
      let hashed

      hash.on('readable', () => {
        const data = hash.read()
        if (data) {
          hashed = data.toString('hex')
        }
      })
      hash.on('end', () => {
        resolve(hashed)
      })

      hash.write(_applySalt(input))
      try {
        hash.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Tests if the given input matches with a previous generated hash
   * @param {string} input
   * @param {string} hash Hash generated previously
   * @return {bool}
   */
  static async matchWithHash (input, hash) {
    return (await Cryptographer.hash(input)) === hash
  }
}

/**
 * In order to defend agains dictionary and rainbow table attacks.
 * @see https://en.wikipedia.org/wiki/Salt_(cryptography)
 * @param {string} input
 * @return {string} Salted input
 */
function _applySalt (input) {
  let salt = process.env.APP_KEY.substring(0, input.length + 1) + input.charCodeAt(2).toString() + input.charCodeAt(4).toString()
  return input + salt
}

module.exports = Cryptographer
