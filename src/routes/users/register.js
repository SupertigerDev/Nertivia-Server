const User = require('../../models/users');
const BannedIPs = require("../../models/BannedIPs");
const JWT = require('jsonwebtoken');
import config from '../../config'
import nodemailer from 'nodemailer';
import blacklistArr from '../../emailBlacklist.json'
const transporter = nodemailer.createTransport({
  service: config.nodemailer.service,
  auth: {
    user: config.nodemailer.user,
    pass: config.nodemailer.pass
  }
})

module.exports = async (req, res, next) => {

  req.session.destroy()
  const { username, email, password } = req.body;


  // check if ip is banned
  const ipBanned = await BannedIPs.exists({ip: req.userIP});
  if (ipBanned) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "IP is banned.", param: "email" }]
    });
  }


  // Check if there is a user with the same email
  const foundUser = await User.findOne({ email });
  if (foundUser) { 
    return res.status(403).json({ 
        status: false,
        errors: [{param: "email", msg: "Email is already used."}]
    });
  }

  // check if email is blacklisted
  const emailBlacklisted = blacklistArr.find(d => d === email.split("@")[1].trim().toLowerCase())
  if (emailBlacklisted) {
    return res.status(403).json({
      errors: [{param: "email", msg: "Email is blacklisted."}]
    });
  }



  // Create a new user
  const newUser = new User({ username, email: email.toLowerCase(), password, ip: req.userIP });
  const created = await newUser.save();
  

  // send email
  const mailOptions = {
    from: config.nodemailer.from,
    to: email.toLowerCase().trim(), 
    subject: 'Nertivia - Confirmation Code',
    html: `<p>Your confirmation code is: <strong>${created.email_confirm_code}</strong></p>`
  };

  transporter.sendMail(mailOptions, (err, info) => {
  })


  // Respond with user
  res.send({
    message: "confirm email"
  })

}