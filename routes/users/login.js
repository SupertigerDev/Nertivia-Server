
const passport = require('../../passport');
const JWT = require('jsonwebtoken');
const config = require('./../../config')

function signToken(uniqueID) {
  return JWT.sign({
    sub: uniqueID,
    iat: new Date().getTime()
  }, config.jwtSecret);
}

module.exports = async (req, res, next) => {
  req.session.destroy()
  // Validate information
  // Generate token
  const token = signToken(req.user.uniqueID);

  const user = {
    username: req.user.username,
    tag: req.user.tag,
    uniqueID: req.user.uniqueID,
    avatar: req.user.avatar,
  }

  res.send({
    status: true,
    message: "You were logged in.",
    action: "logged_in",
    user,
    token
  })
}