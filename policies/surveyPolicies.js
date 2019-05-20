const { check } = require('express-validator/check');
const policyHandler = require('./policyHandler');

const policies = {
  put: [
    check('name').not().isEmpty().withMessage('name is required.').isLength({ min: 0, max:100 }).withMessage("Maximum length exceeded (100 characters)"),
    check('gender').not().isEmpty().withMessage('gender is required.').isNumeric().withMessage('Integer required!'),
    check('age').not().isEmpty().withMessage('age is required.').isNumeric().withMessage('Integer required!'),
    check('continent').not().isEmpty().withMessage('continent is required.').isNumeric().withMessage('Integer required!'),
    check('country').optional().isNumeric().withMessage('Integer required!'),
    check('about_me').not().isEmpty().withMessage('about_me is required.').isLength({ min: 0, max:500 }).withMessage("Maximum length exceeded (500 characters)"),
    policyHandler
  ],

}

// name: "",
// gender: null,
// age: null,
// continent: null,
// country: null,
// about_me: ""
module.exports = policies