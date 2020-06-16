const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  submit: [
    check('screenshot').not().isEmpty().withMessage('Screenshot is required.'),
    check('description').not().isEmpty().withMessage('Description is required.').isLength({min: 5, max: 150}).withMessage('Description must be between 5 to 150 chars long.'),
    policyHandler
  ],
  update: [
    check('screenshot').optional({ checkFalsy: true }),
    check('description').isLength({min: 5, max: 150}).withMessage('Description must be between 5 to 150 chars long.').optional({ checkFalsy: true }),
    policyHandler
  ],

}

module.exports = policies