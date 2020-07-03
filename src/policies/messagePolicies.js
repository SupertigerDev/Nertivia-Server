const { check } = require('express-validator');
const { sanitizeBody } = require('express-validator');

const policyHandler = require('./policyHandler');

const policies = {
  post: [
    check('message').isString().withMessage('message must be a string!').optional(),
    check('socketID').optional(),
    check('tempID').optional(),
    check('buttons').isArray().withMessage('buttons must be an array!').optional(),
    check('htmlEmbed').optional(),
    policyHandler
  ],
  update: [
    check('message').isString().withMessage('message must be a string!').optional({checkFalsy: true}),
    check('color').optional({checkFalsy: true}),
    policyHandler
  ]
}


module.exports = policies