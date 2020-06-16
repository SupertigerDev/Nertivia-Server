const { check } = require("express-validator");
const policyHandler = require("./policyHandler");

const policies = {
  updateRole: [
    check("name")
      .isString()
      .withMessage("Invalid Format.")
      .isLength({ min: 0, max: 30 })
      .withMessage("Name must be shorter than 30 characters")
      .optional({ checkFalsy: true }),
    check("permissions")
      .isNumeric()
      .withMessage("Invalid Format.")
      .isLength({ min: 0, max: 30 })
      .withMessage("permissions must be shorter than 30 characters")
      .optional({ checkFalsy: false }),
    check("color")
      .isString()
      .withMessage("Invalid Format.")
      .isLength({ min: 0, max: 15 })
      .withMessage("color must be shorter than 15 characters")
      .optional({ checkFalsy: true }),
    check("hideRole")
      .isBoolean()
      .withMessage("Invalid Format.")
      .optional({ checkNull: true }),
    policyHandler
  ]
};

module.exports = policies;
