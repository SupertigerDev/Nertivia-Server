const { check } = require('express-validator/check');
const policyHandler = require('./policyHandler');

const policies = {
  updateServer: [
    check('name').isString().withMessage('Invalid Format.').optional({checkFalsy: true}),
    check('default_channel_id').isString().withMessage('Invalid Format.').optional({checkFalsy: true}),
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