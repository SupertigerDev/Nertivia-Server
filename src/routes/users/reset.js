const Users = require("../../models/users");
const BannedIPs = require("../../models/BannedIPs");
const bcrypt = require('bcryptjs');
import config from '../../config';
const sio = require("socket.io");
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  service: config.nodemailer.service,
  auth: {
    user: config.nodemailer.user,
    pass: config.nodemailer.pass
  }
})


module.exports = async (req, res, next) => {
  const {uniqueID, password} = req.body;
  const code = req.params.code;
  req.session.destroy();


  // Find the user given the email
  const user = await Users.findOne({uniqueID}).select(
    "email avatar status admin _id username uniqueID tag created GDriveRefreshToken banned email_confirm_code passwordVersion reset_password_code"
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
  const ipBanned = await BannedIPs.exists({ip: req.userIP});
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



  kickUser(req.io, user.uniqueID)
  // send email
  const mailOptions = {
    from: config.nodemailer.from,
    to: user.email.toLowerCase().trim(), 
    subject: 'Nertivia - Password Changed',
    html: `<p>Hello, ${user.username}!<br> Your password was changed. If this was not done by you, reset your password as soon as possible.`
  };

  transporter.sendMail(mailOptions, (err, info) => {})


  res.send({ message: "Password reset" });
};

/**
 *
 * @param {sio.Server} io
 */
// also used in user update password.
async function kickUser(io, uniqueID, socketID) {
  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (!rooms || !rooms.sockets) return;

  for (const clientId in rooms.sockets) {
    const client = io.sockets.connected[clientId];
    if (!client) continue;
    if (client.id === socketID) continue;
    client.emit("auth_err", "Password Changed.");
    client.disconnect(true);
  }
}