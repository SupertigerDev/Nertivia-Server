const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  updateWebhook: [
    check('name')
    .isString().withMessage('Invalid Format.').trim()
    .isLength({ min: 3, max: 30 }).withMessage("name must be between 3 - 30 chars long.")
    .optional({ checkFalsy: true }),
    check('channelId')
    .isString().withMessage('Invalid Format.').trim()
    .isLength({ min: 3, max: 60 }).withMessage("channelId must be between 3 - 60 chars long.")
    .optional({ checkFalsy: true }),
    policyHandler
  ],


}

module.exports = policies