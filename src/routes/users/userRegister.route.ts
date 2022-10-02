import { Users } from "../../models/Users";
import nodemailer from 'nodemailer';
import validate from 'deep-email-validator'
import blacklistArr from '../../emailBlacklist.json'
import { checkBanned } from "../../services/IPAddress";
import { Request, Response, Router } from "express";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { checkCaptcha } from "../../middlewares/checkCaptcha.middleware";
import authPolicy from '../../policies/authenticationPolicies';


const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export const userRegister = (Router: Router) => {
  Router.route("/register").post(
    authPolicy.register,
    rateLimit({name: 'register', expire: 600, requestsLimit: 5, useIp: true, nextIfInvalid: true }),
    // show captcha 
    checkCaptcha({captchaOnRateLimit: false}),
    route
  );
}

const route = async (req: Request, res: Response) => {

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
  const ipBanned = await checkBanned(req.userIp);
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
  // check if email is blacklisted
  const emailBlacklisted = blacklistArr.find(d => d === email.split("@")[1].trim().toLowerCase())
  if (emailBlacklisted) {
    return res.status(403).json({
      errors: [{param: "email", msg: "Email is blacklisted."}]
    });
  }  
  // Check if there is a user with the same email in the db
  const foundUser = await Users.findOne({ email: email.toLowerCase() });
  if (foundUser) { 
    return res.status(403).json({ 
        status: false,
        errors: [{param: "email", msg: "Email is already used."}]
    });
  }

  const newUser = new Users({ username, email: email.toLowerCase(), password, ip: req.userIp });
  const created = await newUser.save();

  if (process.env.DEV_MODE === "true") {
    return res.status(403).json({
      errors: [{param: "other", msg: "Dev mode. email confirm code: " + created.email_confirm_code}]
    });
  }

  // send email
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email.toLowerCase().trim(), 
    subject: 'Nertivia - Confirmation Code',
    html: `<p>Your confirmation code is: <strong>${created.email_confirm_code}</strong></p>`
  };

  transporter.sendMail(mailOptions, async (err, info) => {
    if (err) {
      await Users.deleteOne({_id: created._id})
      return res.status(403).json({
        errors: [{param: "other", msg: "Something went wrong while sending email. Try again later."}]
      });
    }
    // Respond with user
    res.send({
      message: "confirm email"
    })
  })
}