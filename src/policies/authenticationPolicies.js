const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  register: [
    check('email')
      .not().isEmpty().withMessage("Email is required.")
      .isEmail().withMessage("Valid email is required."),
    check('username')
      .not().isEmpty().withMessage("Username is required.")
      .isLength({min: 3, max: 30}).withMessage("Username must be 3 - 30 chars long.")
      .not().contains(':').withMessage("username cannot contain :")
      .not().contains('@').withMessage("username cannot contain @"),
    check('password')
      .not().isEmpty().withMessage("Password is required.")
      .isLength({min: 3, max: 200}).withMessage("Password must be at least 3 chars long and less than 200 chars."),
    policyHandler
  ],
  login: [
    check('email').not().isEmpty().withMessage('Email is required.'),
    check('password').not().isEmpty().withMessage('Password is required.'),
    policyHandler
  ],
  resetRequest: [
    check('email').not().isEmpty().withMessage('Email is required.'),
    policyHandler
  ],
  reset: [
    check('password')
    .not().isEmpty().withMessage("Password is required.")
    .isLength({min: 3, max: 200}).withMessage("Password must be at least 3 chars long and less than 200 chars."),
    policyHandler
  ],
  confirm: [
    check('email').not().isEmpty().withMessage('Email is required.'),
    check('code').not().isEmpty().withMessage('code is required.'),
    policyHandler
  ]
}


module.exports = policies