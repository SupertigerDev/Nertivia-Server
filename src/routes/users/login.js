import { Users } from "../../models/Users";
import {BannedIPs} from "../../models/BannedIPs";
import { signToken } from "../../utils/JWT";

module.exports = async (req, res, next) => {
  // email can be username:tag.
  const {email, password} = req.body;
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
    "avatar status badges _id username id tag created GDriveRefreshToken password banned email_confirm_code passwordVersion"
  );

  // If not, handle it
  if (!user) {
    return res
      .status(404)
      .json({ errors: [{ msg: "Email is incorrect.", param: "email" }] });
  }
  if (user.email_confirm_code) {
    return res.status(401).json({
      code: "CONFIRM_EMAIL"
    })
  }
  // Check if the password is correct
  const isMatch = await user.isValidPassword(password);

  if (!isMatch) {
    return res
      .status(401)
      .json({
        status: false,
        errors: [{ msg: "Password is incorrect.", param: "password" }]
      });
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
  const ipBanned = await BannedIPs.exists({ip: req.userIp});
  if (ipBanned) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "IP is banned.", param: "email" }]
    });
  }

  user.password = undefined;

  // Generate token without header information
  const token = await signToken(user.id, user.passwordVersion)

  const data = {
    username: user.username,
    tag: user.tag,
    id: user.id,
    avatar: user.avatar
  };

  res.send({
    message: "You were logged in.",
    action: "logged_in",
    user: data,
    token
  });
};
