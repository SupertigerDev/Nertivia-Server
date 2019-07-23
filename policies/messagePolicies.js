const { check } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const policyHandler = require('./policyHandler');

const policies = {
  post: [
    check('message').isString().withMessage('message must be a string!').optional(),
    check('socketID').optional(),
    check('tempID').optional(),
    policyHandler
  ],
  update: [
    check('message').isString().withMessage('message must be a string!').optional({checkFalsy: true}),
    policyHandler
  ]
}


module.exports = policies