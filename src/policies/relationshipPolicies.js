const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  post: [
    check('username').not().isEmpty().withMessage('username is required.'),
    check('tag')
      .not().isEmpty().withMessage('tag is required.')
      .isLength({ min: 4, max:4 }).withMessage('tag must be 4 digits long.'),
    policyHandler
  ],
  put: [
    check('id').not().isEmpty().withMessage('id is required.'),
    policyHandler
  ],
  delete: [
    check('id').not().isEmpty().withMessage('id is required.'),
    policyHandler
  ]

}


module.exports = policies