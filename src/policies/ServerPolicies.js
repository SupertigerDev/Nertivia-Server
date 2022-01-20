const { check } = require("express-validator");
const policyHandler = require("./policyHandler");

const policies = {
  updateChannel: [
    check("name")
      .isString().withMessage("Invalid Format.")
      .isLength({ min: 0, max: 30 }).withMessage("Name must be shorter than 30 characters"),
    check("icon")
    .isString().withMessage("Invalid Format.")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 60 }).withMessage("icon must be shorter than 60 characters"),
    policyHandler
  ],
  createChannel: [
    check("name")
      .exists()
      .withMessage("Name field is empty.")
      .isString()
      .withMessage("Invalid Format.")
      .isLength({ min: 0, max: 30 })
      .withMessage("Name must be shorter than 30 characters"),
    check("type")
      .isInt({min: 1, max: 2})
      .withMessage("type must be 1 or 2.")
      .optional()
    ,
    policyHandler
  ],
  createServer: [
    check("name")
      .isString()
      .withMessage("Invalid Format.")
      .isLength({ min: 0, max: 30 })
      .withMessage("Name must be shorter than 30 characters"),
    policyHandler
  ],
  updateServer: [
    check("name")
      .isString()
      .withMessage("Invalid Format.")
      .isLength({ min: 0, max: 30 })
      .withMessage("Name must be shorter than 30 characters")
      .optional({ checkFalsy: true }),
    check("default_channel_id")
      .isString()
      .withMessage("Invalid Format.")
      .optional({ checkFalsy: true }),
    check("avatar")
      .isString()
      .withMessage("Invalid Format.")
      .optional({ checkFalsy: true }),
    check("banner")
      .isString()
      .withMessage("Invalid Format.")
      .optional({ checkFalsy: true }),
    policyHandler
  ]
};

// name: "",
// gender: null,
// age: null,
// continent: null,
// country: null,
// about_me: ""
module.exports = policies;
