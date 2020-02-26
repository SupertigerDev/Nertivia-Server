const { check } = require('express-validator/check');
const policyHandler = require('./policyHandler');

const policies = {
  updateUser: [
    check('username').isString().withMessage('Invalid Format.').isLength({min: 3, max: 30}).withMessage("Username must be between 3 - 30 chars long.")
    .not().contains(':').withMessage("username cannot contain :").optional({checkFalsy: true}),

    check('tag').isString().withMessage('Invalid Format.').isAlphanumeric().withMessage('Tag must contain alphanumeric characters and no spaces.').isLength({min: 4, max: 4}).withMessage('Tag must be 4 characters long.').optional({checkFalsy: true}),
    check('password').isString().withMessage('Invalid Format.').optional({checkFalsy: true}),
    check('email').isEmail().withMessage('Invalid email.').optional({checkFalsy: true}),
    check('new_password').isString().withMessage('Invalid Format.').isLength({min: 3}).withMessage("New password must be at least 3 chars long.").optional({checkFalsy: true}),
    check('avatar').isString().withMessage('Invalid Format.').optional({checkFalsy: true}),
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