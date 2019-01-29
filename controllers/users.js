const JWT = require('jsonwebtoken');
const User = require('../models/users');
const Friend = require('../models/friends');
const { check, validationResult } = require('express-validator/check');
const config = require('./../config')
const passport = require('../passport');
const newUser = passport.newUser;


module.exports = {
  details: async (req, res, next) => {
    // Send user their details (username etc.)
    res.json({ status: true, user: req.user });
  }
}