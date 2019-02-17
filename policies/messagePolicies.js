const { check } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const policyHandler = require('./policyHandler');

const policies = {
  post: [
    check('message').not().isEmpty().withMessage('message is required.').trim(),
    check('socketID').optional(),
    check('tempID').optional(),
    policyHandler
  ]
}


module.exports = policies