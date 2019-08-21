
const passport = require('../../passport');
const JWT = require('jsonwebtoken');
const config = require('./../../config')

function signToken(user) {
  return JWT.sign({
    sub: user.uniqueID,
    iat: new Date().getTime()
  }, config.jwtSecret);
}

module.exports = async (req, res, next) => {
  req.session.destroy()
  // Validate information
  // Generate token
  const token = signToken(req.user);
  res.send({
    status: true,
    message: "You were logged in.",
    action: "logged_in",
    token
  })
}