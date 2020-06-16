const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  put: [
    check('name').isLength({ min: 0, max:100 }).withMessage("Maximum length exceeded (100 characters)").optional({checkFalsy: true}),
    check('gender').isLength({ min: 0, max:15 }).withMessage("Maximum length exceeded (100 characters)").optional({checkFalsy: true}),
    check('age').isLength({ min: 0, max:15 }).withMessage("Maximum length exceeded (100 characters)").optional({checkFalsy: true}),
    check('continent').isLength({ min: 0, max:100 }).withMessage("Maximum length exceeded (100 characters)").optional({checkFalsy: true}),
    check('country').isLength({ min: 0, max:100 }).withMessage("Maximum length exceeded (100 characters)").optional({checkFalsy: true}),
    check('about_me').isLength({ min: 0, max:500 }).withMessage("Maximum length exceeded (500 characters)").optional({checkFalsy: true}),
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