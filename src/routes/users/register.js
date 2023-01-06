import { Users } from "../../models/Users";
import {BannedIPs} from "../../models/BannedIPs";
import nodemailer from 'nodemailer';
import validate from 'deep-email-validator'
import blacklistArr from '../../emailBlacklist.json'
import { checkRateLimited } from "../../newRedisWrapper";
const JWT = require("jsonwebtoken");

module.exports = async (req, res, next) => {

  req.session.destroy()
  let { username, email, password } = req.body;

  username = username.replace(
    /[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F\u{2000}-\u{200F}\u{202F}\u{2800}\u{17B5}\u{17B5}\u{17B5}\u{17B5}\u{17B5}\u{17B5}]/gu,
    ""
  );
    // check if result is empty
    if (!username.trim()) {
    return res
    .status(403)
    .json({ errors: [{ param: "username", msg: "Username is required." }] });
  }


  // check if ip is banned
  const ipBanned = await BannedIPs.exists({ip: req.userIP});
  if (ipBanned) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "IP is banned.", param: "email" }]
    });
  }


  // check if the email really exists
  const emailExists = await validate({email, validateTypo: false, validateSMTP: false});

  if (!emailExists.valid && !process.env.DEV_MODE) {
    return res.status(403).json({
      errors: [{param: "email", msg: `Email is Invalid (${emailExists.reason}).`}]})
  }



  // Check if there is a user with the same email in the db
  const foundUser = await Users.findOne({ email: email.toLowerCase() });
  if (foundUser) { 
    return res.status(403).json({ 
        status: false,
        errors: [{param: "email", msg: "Email is already used."}]
    });
  }


  console.log("Account created with the domain " + email.split("@")[1].trim().toLowerCase());


  const newUser = new Users({ username, email: email.toLowerCase(), password, ip: req.userIP });
  const created = await newUser.save();

  const token = signToken(created.id, created.passwordVersion)
    .split(".")
    .splice(1)
    .join(".");

  res.send({
    token
  })
}

function signToken(user_id, pwdVer) {
  if (pwdVer !== undefined) {
    return JWT.sign(`${user_id}-${pwdVer}`, process.env.JWT_SECRET);
  } else {
    return JWT.sign(user_id, process.env.JWT_SECRET);
  }
}
