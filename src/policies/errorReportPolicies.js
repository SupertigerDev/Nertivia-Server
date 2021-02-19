const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  post: [
    check('message').isLength({ min: 0, max:300 }).withMessage("Maximum length exceeded (300 characters)").optional(),
    check('name').isLength({ min: 0, max:150 }).withMessage("Maximum length exceeded (150 characters)").optional(),
    check('stack').isLength({ min: 0, max:2000 }).withMessage("Maximum length exceeded (2000 characters)").optional(),
    check('user_message').isLength({ min: 0, max:500 }).withMessage("Maximum length exceeded (500 characters)").optional(),
    check('url').isLength({ min: 0, max:150 }).withMessage("Maximum length exceeded (150 characters)").optional(),
    policyHandler
  ],

}

module.exports = policies