const { check, validationResult } = require('express-validator/check');
const User = require('../models/users');
const passport = require('../passport');
const newUser = passport.newUser;
const JWT = require('jsonwebtoken');
const config = require('./../config')

function signToken(user) {
  return JWT.sign({
    sub: user.uniqueID,
    iat: new Date().getTime()
  }, config.jwtSecret);
}

module.exports = {
  register: async (req, res, next) => {
    req.session.destroy()
    // Validate information
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ status: false, errors: errors.array() });
    }

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
      user: passport.newUser(user),
      token,
    })
  },

  login: async (req, res, next) => {
    req.session.destroy()
    // Validate information
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ status: false, errors: errors.array() });
    }
  
    // Generate token
    const token = signToken(req.user);
    res.send({
      status: true,
      message: "You were logged in.",
      action: "logged_in",
      user: req.user,
      token
    })
  }
}