const { check } = require('express-validator');
const policyHandler = require('./policyHandler');

const policies = {
  updateUser: [
    check('username')
    .isString().withMessage('Invalid Format.').trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 - 30 chars long.")
    .not().contains(':').withMessage("username cannot contain :")
    .not().contains('@').withMessage("username cannot contain @")
    .optional({ checkFalsy: true }),

    check('tag').isString().withMessage('Invalid Format.').isAlphanumeric().withMessage('Tag must contain alphanumeric characters and no spaces.').isLength({ min: 4, max: 4 }).withMessage('Tag must be 4 characters long.').optional({ checkFalsy: true }),
    check('password').isString().withMessage('Invalid Format.').optional({ checkFalsy: true }),
    check('email').isEmail().withMessage('Invalid email.').optional({ checkFalsy: true }),
    check('new_password').isString().withMessage('Invalid Format.').isLength({ min: 3 }).withMessage("New password must be at least 3 chars long.").optional({ checkFalsy: true }),
    check('avatar').isString().withMessage('Invalid Format.').optional({ checkFalsy: true }),
    check('banner').isString().withMessage('Invalid Format.').optional({ checkFalsy: true }),
    policyHandler
  ],
  updateBot: [
    check('username').isString().withMessage('Invalid Format.').trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 - 30 chars long.")
    .not().contains(':').withMessage("username cannot contain :")
    .not().contains('@').withMessage("username cannot contain @")
    .optional({ checkFalsy: true }),

    check('tag').isString().withMessage('Invalid Format.').isAlphanumeric().withMessage('Tag must contain alphanumeric characters and no spaces.').isLength({ min: 4, max: 4 }).withMessage('Tag must be 4 characters long.').optional({ checkFalsy: true }),
    check('avatar').isString().withMessage('Invalid Format.').optional({ checkFalsy: true }),
    check("botPrefix").isString().withMessage("Invalid Format").isLength({max: 5}).withMessage("Prefix must be at least 5 characters long.").optional({checkFalsy: true}),
    check("botCommands").custom((val) => {
      if (!Array.isArray(val)){
        throw new Error('Invalid Format');
      }
      if (val.length > 200) {
        throw new Error('Max amount of commands you can have is 200.');
      }
      for (let i = 0; i < val.length; i++) {
        const cmd = val[i];
        if (Object.keys(cmd).length > 2) {
          throw new Error('Object contains unusual things.');
        }
        if (!cmd.c) {
          throw new Error('Object is missing arg or command');
        }
        if (typeof cmd.c !== "string" ||( typeof cmd.a !== "string" && typeof cmd.a !== "undefined") ) {
          throw new Error('Invalid command type');
        }
        if (cmd.c.length > 20) {
          throw new Error('Command name must be less than 20 characters');
        }
        if (cmd.a && cmd.a.length > 80) {
          throw new Error('args name must be less than 80 characters');
        }
      }
      return true;
      
    }).optional({checkFalsy: true}),
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