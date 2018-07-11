'use strict'

module.exports = {
  errors: {
    ForbiddenError: require('./lib/errors/forbiddenError'),
    ResourceNotFoundError: require('./lib/errors/resourceNotFoundError'),
    ValidationError: require('./lib/errors/validationError')
  },
  http: {
    catchError: require('./lib/http/catchError'),
    HttpResponseBuilder: require('./lib/http/httpResponseBuilder'),
    PaginatedResult: require('./lib/http/paginatedResult'),
    paginator: require('./lib/http/paginator')
  },
  middleware: {
    LoggingHandler: require('./lib/middleware/loggingHandler'),
    UserTokenMiddleware: require('./lib/middleware/userTokenMiddleware')
  },
  model: {
    sanitizors: {
      ToIntOptionalSanitizor: require('./lib/model/sanitizors/toIntOptionalSanitizor')
    },
    validators: {
      Base64Validator: require('./lib/model/validators/base64Validator'),
      DateValidator: require('./lib/model/validators/dateValidator'),
      DurationValidator: require('./lib/model/validators/durationValidator'),
      ObjectIdValidator: require('./lib/model/validators/objectIdValidator'),
      OfTypeValidator: require('./lib/model/validators/ofTypeValidator'),
      ValidationHelper: require('./lib/model/validators/validationHelper')
    },
    BaseValidator: require('./lib/model/baseValidator'),
    Entity: require('./lib/model/entity')
  },
  test: {
    apiRequest: require('./lib/test/apiRequest')
  },
  utils: {
    circuitBreaker: require('./lib/utils/circuitBreaker'),
    currentUser: require('./lib/utils/currentUser'),
    mongoritoUtils: require('./lib/utils/mongoritoUtils'),
    cryptographer: require('./lib/utils/cryptographer')
  }
}
