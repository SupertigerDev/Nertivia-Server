import { Users } from "../../models/Users";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { checkBanned } from "../../services/IPAddress";
import { Request, Response } from "express";

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})


export const resetPasswordRequest = async (req: Request, res: Response) => {
  // email can be username:tag.
  const {email} = req.body;
  // Validate information

  const usernameTag = email.split(":");

  const obj = {
    ...(usernameTag.length === 2 && { username: usernameTag[0], tag: usernameTag[1] }),
    ...(usernameTag.length !== 2 && { email: email.toLowerCase() })
  }

  // Find the user given the email
  const user = await Users.findOne(obj).select(
    "avatar status admin _id username id tag created GDriveRefreshToken banned email_confirm_code passwordVersion"
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
  const ipBanned = await checkBanned(req.userIp);
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
    from: process.env.SMTP_FROM,
    to: email.toLowerCase().trim(), 
    subject: 'Nertivia - Reset Password',
    html: `<p>Hello, ${user.username}!<br> Click on this link to reset your password: <strong>https://nertivia.net/reset-password?unique-id=${user.id}&code=${resetCode}</strong></p>`
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