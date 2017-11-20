const regex = /^\d+$/

/**
 * European Article Numbering
 * @see https://en.wikipedia.org/wiki/International_Article_Number
 */
class EanValidator {
  static validate (fieldValue, message, resolve, reject) {
    if (fieldValue.match(regex)) {
      resolve('Value is a valid EAN string')
    } else {
      reject(message)
    }
  }
}

module.exports = EanValidator
