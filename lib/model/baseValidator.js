const indicative = require('indicative')
const ValidationHelper = require('./validators/validationHelper')
const OfTypeValidator = require('./validators/ofTypeValidator')
const DurationValidator = require('./validators/durationValidator')
const ObjectIdValidator = require('./validators/objectIdValidator')
const DateValidator = require('./validators/dateValidator')
const Base64Validator = require('./validators/base64Validator')
const EntityValidator = require('./validators/entityValidator')

const ToIntOptionalSanitizor = require('./sanitizors/toIntOptionalSanitizor')
const ToObjectIdSanitizor = require('./sanitizors/toObjectIdSanitizor')

indicative.validations['dateObject'] = ValidationHelper.inIndicative(OfTypeValidator.validate(Date), 'Value should be a Javascript date')
indicative.validations['objectIdString'] = ValidationHelper.inIndicative(ObjectIdValidator.validate, 'Value should be a string containing a valid ObjectId')
indicative.validations['durationString'] = ValidationHelper.inIndicative(DurationValidator.validate, 'Value should be a string containing a valid ISO-8601 duration')
indicative.validations['dateString'] = ValidationHelper.inIndicative(DateValidator.validate, 'Value should be a string containing a valid ISO-8601 date')
indicative.validations['base64'] = ValidationHelper.inIndicative(Base64Validator.validate, 'Value should be a string with Base64 format')
indicative.validations['validEntity'] = ValidationHelper.inIndicative(EntityValidator.validate, 'Value should be a valid Entity')

indicative.sanitizor['toIntOptional'] = ToIntOptionalSanitizor.toIntOptional
indicative.sanitizor['toObjectId'] = ToObjectIdSanitizor.toObjectId

/**
 * Base class to create attribute validators. By extending this class and
 * implementing the `validations` and `sanitizations` method it's possible to
 * have versatile validators for different entities
 */
class BaseValidator {
  /**
   * Return the validation rules for homebook/* entity
   *
   * @see http://indicative.adonisjs.com/
   * @return {object} Simple rules object following indicative semantics
   */
  validations () {
    return {}
  }

  /**
   * Return the sanitization rules for homebook/* entity
   *
   * @see http://indicative.adonisjs.com/
   * @return {object} Simple rules object following indicative semantics
   */
  sanitizations () {
    return {}
  }

  /**
   * Uses indicative sanitize functionality to ensure attribute quality
   * Sanitizes '_id' into a real objectId by default
   * @param  {object} attributes
   * @return {object} Sanitized attributes
   */
  async sanitize (attributes) {
    let sanitizationRules = this.sanitizations()

    if (typeof sanitizationRules._id === 'undefined') {
      sanitizationRules._id = 'toObjectId'
    }

    return indicative.sanitize(attributes, sanitizationRules)
  }

  /**
   * Performs validation
   *
   * @param  {object} Entity attributes
   * @return {Array} Validation error messages
   */
  async getErrors (attributes) {
    try {
      await indicative.validateAll(attributes, this.validations())
    } catch (errors) {
      return errors.map(error => error.message)
    }

    return []
  }
}

module.exports = BaseValidator
