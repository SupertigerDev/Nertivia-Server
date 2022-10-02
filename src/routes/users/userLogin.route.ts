import { Users } from "../../models/Users";
import { signToken } from "../../utils/JWT";
import bcrypt from 'bcryptjs';
import { checkBanned } from "../../services/IPAddress";
import { Request, Response, Router } from "express";
import { checkCaptcha } from "../../middlewares/checkCaptcha.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import authPolicy from '../../policies/authenticationPolicies';

export const userLogin = (Router: Router) => {
  Router.route("/login").post(
    authPolicy.login,
    rateLimit({name: 'login', expire: 600, requestsLimit: 5, useIp: true, nextIfInvalid: true }),
    checkCaptcha({captchaOnRateLimit: true}),
    route
  );

}
const route = async (req: Request, res: Response) => {
  // email can be username:tag.
  const {email, password} = req.body;
  // Validate information
  
  const usernameTag = email.split(":");

  const obj = {
    ...(usernameTag.length === 2 && { username: usernameTag[0], tag: usernameTag[1] }),
    ...(usernameTag.length !== 2 && { email: email.toLowerCase() })
  }

  // Find the user given the email
  const user = await Users.findOne(obj).select(
    "avatar status badges _id username id tag created GDriveRefreshToken password banned email_confirm_code passwordVersion"
  );

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
  const isMatch = await bcrypt.compare(password, user.password);

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
  const ipBanned = await checkBanned(req.userIp);
  if (ipBanned) {
    return res
    .status(401)
    .json({
      errors: [{ msg: "IP is banned.", param: "email" }]
    });
  }


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
