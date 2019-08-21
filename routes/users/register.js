const User = require('../../models/users');
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
  const { username, email, password } = req.body;

  // Check if there is a user with the same email
  const foundUser = await User.findOne({ email });
  if (foundUser) { 
    return res.status(403).json({ 
        status: false,
        errors: [{param: "email", msg: "Email is already used."}]
    });
  }

  // Create a new user
  const newUser = new User({ username, email, password });
  const user = await newUser.save();

  // Generate the token
  const token = signToken(newUser);


  // Respond with user
  res.send({
    status: true,
    message: "Account was successfully created and logged in.",
    action: "account_created",
    token,
  })
}