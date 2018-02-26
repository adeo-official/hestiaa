const Mongorito = require('mongorito')
const ObjectId = Mongorito.ObjectId
const ResourceNotFoundError = require('../errors/resourceNotFoundError')
const ValidationError = require('../errors/validationError')
const MongoritoUtils = require('../utils/mongoritoUtils')
const CurrentUser = require('../utils/currentUser')
const _ = require('lodash')

class Entity extends Mongorito.Model {
  /**
   * Overwrites save method in order to enforce attribute validation before
   * sending user to persistant storage
   *
   * @throws {ValidationError} If entity is not valid to be saved
   * @return {Promise}
   */
  async save () {
    if (await this.isValid()) {
      return super.save()
    }
  }

  /**
   * In case we clear on Entity, we have to keep the readOnly fields
   * @return {Array} Array of fields that won't be erased by the clear method
   */
  __readOnlyProps () {
    return ['_id'].concat(MongoritoUtils.traceabilityFieldNames)
  }

  /**
   * Clear all the fields of an entity except the _id
   * @return {Promise}
   */
  async clear () {
    let excludedProps = this.__readOnlyProps()
    let filteredProps = Object.keys(this.get()).filter((prop) => !excludedProps.includes(prop))

    return this.unset(filteredProps)
  }

  /**
   * Obtains the validator to be called by `isValid`.
   * @return a subclass of BaseValidator dedicating to validation of instances of this class
   */
  __getValidator () {
    let validator = this.constructor.name + 'Validator'
    let validatorFile = validator.charAt(0).toLowerCase() + validator.substr(1)
    throw new Error(`The class '${this.constructor.name}' has no '__getValidator()' method.
One good implementation could be

  // Don't forget the const ${validator} = require('./${validatorFile}')
  /**
   * Get validator for ${this.constructor.name}
   * Overwrites the Entity.__getValidator() method
   * @return a subclass of BaseValidator. In that case, ${validator}
   */
  __getValidator() {
    return new ${validator}()
  }
`)
  }

  /**
   * Base version of the sanitize method.
   * Subclasses can extend this method if they have specific sanitization needs (one can typically take a look at
   * Habitation, which precisely perform custom sanitization)
   */
  async sanitize () {
    this.set(await this.__getValidator().sanitize(this.get()))
  }

  /**
   * Sanitizes and validates the current instance
   *
   * @throws {ValidationError} If is not valid
   * @return {boolean} True if valid (and throws otherwise)
   */
  async isValid () {
    await this.sanitize()
    let errors = await this.__getValidator().getErrors(this.get())

    return this._encapsulateErrors(errors)
  }

  /**
   * Transforms indicative validation message to user-friendly message.
   * Wrap errors into an `ValidationError`.
   * @param errors {Array.string} the array of error strings
   * @return true if no error is sent
   * @throws ValidationError if at least one error is thrown
   */
  _encapsulateErrors (errors) {
    if (errors.length === 0) {
      return true
    } else {
      errors = errors.map(error => `${this.constructor.name}(_id=${this.get('_id')}): ${error}`)
      throw new ValidationError(errors)
    }
  }

  /**
   * Remove given object from the given collection
   * @param {string} collectionName name of one of the collections contained in this object
   * @param {Entity} value to remove
   * @return true if element was correctly removed, false otherwise
   */
  async unembed (collectionName, value) {
    let collection = this.get(collectionName)
    let valueId = value.get('_id').toString()
    let index = -1
    if (collection) {
      index = collection.findIndex(function (element) {
        if (element.get('_id') === undefined) {
          return false
        }
        return element.get('_id').toString() === valueId
      })
    }
    if (index >= 0) {
      collection.splice(index, 1)
      this.set(collectionName, collection)
      return true
    } else {
      return false
    }
  }

  /**
   * Add a new element to a given collection
   * @param {string} collectionName name of one of the collections contained in this object
   * @param {Entity} value to add. Notice that the Entity#isValid method is called on that entity during embed
   * @return {Entity} the embedded value.
   */
  async embed (collectionName, value) {
    if (await value.isValid()) {
      if (typeof value.get('_id') === 'undefined') {
        value.set('_id', new ObjectId())

        value.set(MongoritoUtils.createdDateFieldName, MongoritoUtils.now())
        value.set(MongoritoUtils.createdByFieldName, CurrentUser.getValue())
      } else {
        // If unembed return false, it means value was not found in collection, which in turn means the update is incorrect
        if (!await this.unembed(collectionName, value)) {
          throw new ResourceNotFoundError(null, `No '${value.constructor.name}' was found in '${this.constructor.name}.${collectionName}' with id ${value.get('_id')}`)
        }
      }

      value.set(MongoritoUtils.updatedDateFieldName, MongoritoUtils.now())
      value.set(MongoritoUtils.updatedByFieldName, CurrentUser.getValue())

      let collection = this.get(collectionName)
      if (typeof collection === 'undefined') {
        collection = []
      }

      collection.push(value)
      this.set(collectionName, collection)
    }
    return value
  }

  /**
   * Retrieve an specific embedded document by it's id
   *
   * @throws {ResourceNotFoundError} If the given _id couldn't be found
   *
   * @param {string}          collectionName Name of the field where the embedded document is.
   * @param {string|ObjectId} _id            The identificator of the document to retrieve
   *
   * @return {object} The embeded document found
   */
  getEmbeded (collectionName, _id) {
    let idString = (_id || '').toString()
    let collection = this.get(collectionName) || []
    let object = collection.find((element) => {
      return element.get('_id').toString() === idString
    })

    if (object) {
      return object
    }

    throw new ResourceNotFoundError(null, `Coudn't found id ${idString} in '${this.constructor.name}.${collectionName}'`)
  }

  /**
   * Wrapper for {@link #set()} secured for mass assignment.
   *
   * Filter "non-fillable fields" (based on {@link BaseValidator#validations()} paths).
   * Filter "readonly" fields (based on {@link #__readOnlyProps()} paths).
   *
   * @param {object} data
   */
  massAssign (data) {
    let paths = Object.keys(this.__getValidator().validations())
    paths = _.difference(paths, this.__readOnlyProps())

    data = _.clone(data)
    data = Entity._filterFields(data, paths)

    this.set(data)
  }

  /**
   * @param {object} obj The object to modify. Must be cloned to avoid parameter modification.
   * @param {Array<string>} paths
   * @private
   */
  static _filterFields (obj, paths) {
    if (paths.every(p => p === '')) {
      return obj
    }

    let basePaths = paths.map(p => p.split('.')[0])
    for (let prop in obj) {
      // process root-properties
      if (!basePaths.includes(prop)) {
        delete obj[prop]
        continue
      }

      // process sub-property
      let subPaths = paths.filter(p => p.startsWith(prop + '.')).map(p => p.replace(/^[^\\.]+\./g, ''))
      if (subPaths.length > 0) {
        if (subPaths[0].startsWith('*')) { // Array support
          subPaths = subPaths.map(p => p.replace(/^\*\.?/g, ''))
          for (let item of obj[prop]) {
            Entity._filterFields(item, subPaths)
          }
        } else { // Object
          Entity._filterFields(obj[prop], subPaths)
        }
      }
    }

    return obj
  }
}

module.exports = Entity
