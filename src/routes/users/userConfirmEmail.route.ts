import { Users } from "../../models/Users";
import { signToken } from "../../utils/JWT";
import { checkBanned } from "../../services/IPAddress";
import { Request, Response, Router } from "express";
import authPolicy from '../../policies/authenticationPolicies';

export const userConfirmEmail = (Router: Router) => {
  Router.route("/register/confirm").post(
    authPolicy.confirm,
    route
  );
}

const route = async (req: Request, res: Response) => {
  const { code, email } = req.body;

  // check if ip is banned
  const ipBanned = await checkBanned(req.userIp);
  if (ipBanned) {
    return res.status(401).json({
      error: "IP is banned."
    });
  }

  // Check if there is a user with the same email
  const foundUser = await Users.findOne({ email: email.toLowerCase() }).select(
    "id email_confirm_code passwordVersion"
  );
  if (!foundUser) {
    return res.status(404).json({
      error:"Invalid email."
    });
  }
  if (!foundUser.email_confirm_code) {
    return res.status(401).json({
      error: "Email already confirmed."
    });
  }

  if (code !== foundUser.email_confirm_code) {
    return res.status(401).json({
      error:"Invalid code."
    });
  }

  await Users.updateOne({_id: foundUser._id}, {$unset: {email_confirm_code: 1}})

  // Generate the token without header information
  const token = await signToken(foundUser.id, foundUser.passwordVersion)

  // Respond with user
  res.send({
    token
  });
};