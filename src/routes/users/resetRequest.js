const Users = require("../../models/users");
const BannedIPs = require("../../models/BannedIPs");
const JWT = require("jsonwebtoken");
import config from '../../config';
const crypto = require("crypto")
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  service: config.nodemailer.service,
  auth: {
    user: config.nodemailer.user,
    pass: config.nodemailer.pass
  }
})


module.exports = async (req, res, next) => {
  // email can be username:tag.
  const {email, password} = req.body;
  req.session.destroy();
  // Validate information

  let obj;
  const usernameTag = email.split(":");
  if (usernameTag.length === 2) {
    obj = {username: usernameTag[0], tag: usernameTag[1]}
  } else {
    obj = {email: email.toLowerCase()};
  }
  // Find the user given the email
  const user = await Users.findOne(obj).select(
    "avatar status admin _id username uniqueID tag created GDriveRefreshToken banned email_confirm_code passwordVersion"
  );

  // If not, handle it
  if (!user) {
    return res
      .status(404)
      .json({ errors: [{ msg: "Email does not exist.", param: "email" }] });
  }

  // check if user is banned
  if (user.banned) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "You are suspended.", param: "email" }]
    });
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


  const resetCode = await cryptoAsync()


  await Users.updateOne({_id: user._id}, {$set: {reset_password_code: resetCode}})

  // send email
  const mailOptions = {
    from: config.nodemailer.from,
    to: email.toLowerCase().trim(), 
    subject: 'Nertivia - Reset Password',
    html: `<p>Hello, ${user.username}!<br> Click on this link to reset your password (Link expires in 12 hours): <strong>https://nertivia.tk/reset?unique-id=${user.uniqueID}&code=${resetCode}</strong></p>`
  };

  transporter.sendMail(mailOptions, (err, info) => {})


  res.send({ message: "Email sent." });
};

function cryptoAsync() {
  return new Promise((res, rej) => {
    crypto.randomBytes(128, (err, buf) => {
      if (err) {
        rej(err)
        return;
      }
      res(buf.toString('hex'));
    });
  })
}