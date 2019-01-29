const { check } = require('express-validator/check');
const policyHandler = require('./policyHandler');

const policies = {
  register: [
    check('email')
      .not().isEmpty().withMessage("Email is required.")
      .isEmail().withMessage("Valid email is required."),
    check('username')
      .not().isEmpty().withMessage("Username is required.")
      .isLength({min: 3, max: 30}).withMessage("Username must be between 3 - 30 chars long.")
      .not().contains('@').withMessage("username cannot contain @"),
    check('password')
      .not().isEmpty().withMessage("Password is required.")
      .isLength({min: 3}).withMessage("Password must be at least 3 chars long."),
    policyHandler
  ],
  login: [
    check('email').not().isEmpty().withMessage('Email is required.'),
    check('password').not().isEmpty().withMessage('Password is required.'),
    check('token').not().isEmail().withMessage('ReCaptcha is not checked!'),
    policyHandler
  ]
}


module.exports = policies