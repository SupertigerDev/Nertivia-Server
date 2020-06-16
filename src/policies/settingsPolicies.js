const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  status: [
    check('status')
      .not().isEmpty().withMessage('status is required.')
      .isNumeric().withMessage('status must be a number')
      .isInt({min:0, max:4}).withMessage('status must be between 0 - 4')
      .isLength({max: 1}).withMessage('status must be 1 digit long.'),
    policyHandler
  ]

}


module.exports = policies