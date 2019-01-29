const { check, validationResult } = require('express-validator/check');
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ status: false, errors: errors.array() });
  }
  next();
}