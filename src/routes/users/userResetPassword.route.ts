import { Users } from "../../models/Users";
import {BannedIPs} from "../../models/BannedIPs";
const bcrypt = require('bcryptjs');
import nodemailer from 'nodemailer';
import { kickUser } from '../../utils/kickUser';
import { checkBanned } from "../../services/IPAddress";
import { Request, Response, Router } from "express";

import authPolicy from '../../policies/authenticationPolicies';

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})


export const userResetPassword = (Router: Router) => {
  Router.route("/reset/code/:code").post(
    authPolicy.reset,
    route
  );
}

const route = async (req: Request, res: Response) => {
  const {id, password} = req.body;
  const code = req.params.code;


  // Find the user given the email
  const user = await Users.findOne({id: id}).select(
    "email avatar status admin _id username id tag created GDriveRefreshToken banned email_confirm_code passwordVersion reset_password_code"
  );

  // If not, handle it
  if (!user) {
    return res
      .status(404)
      .json({ errors: [{ msg: "User does not exist.", param: "email" }] });
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
  const ipBanned = await checkBanned(req.userIp)
  if (ipBanned) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "IP is banned.", param: "email" }]
    });
  }

  if (user.reset_password_code !== code) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "Invalid or expired reset code.", param: "password" }]
    });
  }


  // change password
  const salt = await bcrypt.genSalt(10);
  // Generate a password hash
  const passwordHash = await bcrypt.hash(password, salt);
  if (!passwordHash) {
    return res
      .status(403)
      .json({
        errors: [{ msg: "Something went wrong (Hash failed)", param: "password" }]
      });
  }

  await Users.updateOne({_id: user._id}, {$set: {password: passwordHash}, $unset: {reset_password_code: 1}, $inc: {passwordVersion: 1}})



  kickUser(user.id, "Password Changed.")
  // send email
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: user.email.toLowerCase().trim(), 
    subject: 'Nertivia - Password Changed',
    html: `<p>Hello, ${user.username}!<br> Your password was changed. If this was not done by you, reset your password as soon as possible.`
  };

  transporter.sendMail(mailOptions, (err, info) => {})


  res.send({ message: "Password reset" });
};