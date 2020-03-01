const { check } = require('express-validator/check');
const policyHandler = require('./policyHandler');

const policies = {
  save: [
    check('name').isString().withMessage('Invalid Format.').isLength({min: 3, max: 30}).withMessage("name must be between 3 - 30 chars long."),    
    check('css').isString().withMessage('Invalid Format.').isLength({min: 5, max: 30000}).withMessage('css must be between 5 to 30000 chars long.'),
    policyHandler
  ],

}

module.exports = policies