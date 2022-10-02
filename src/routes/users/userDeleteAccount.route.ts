import { Request, Response, Router } from "express";
import { Users } from "../../models/Users";
import * as NertiviaCDN from '../../common/NertiviaCDN';
import { deleteAllUserFCM } from "../../utils/sendPushNotification";
import { kickUser } from "../../utils/kickUser";
import * as UserCache from '../../cache/User.cache';
import bcrypt from 'bcryptjs';
import { authenticate } from "../../middlewares/authenticate";

export const userDeleteAccount = (Router: Router) => {
  Router.route("/delete-account").delete(
    authenticate(),
    route
  );
}
const route = async (req: Request, res: Response) => {
  const { password } = req.body;


  // validate password
  const user = await Users.findById(req.user._id).select("password servers");
  if (!user){
    return res
    .status(404)
    .json({error: "User could not be found."})
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res
    .status(403)
    .json({error: "Password does not match."})
  }


  // CHECK:
  // Users MUST 
  // leave/delete all servers
  // delete all bots
  
  const botExists = await Users.exists({createdBy: req.user._id});
  if (botExists) {
    return res
    .status(403)
    .json({error: "You must delete all of your bots before deleting your account."})
  }

  if (user.servers?.length) {
    return res
    .status(403)
    .json({error: "You must leave / Delete all of your servers before deleting your account."})
  }

  await deleteAllUserFCM(req.user.id);



  await Users.updateOne({_id: req.user._id}, {
    $set: {
      username: "Deleted User " + (Math.floor(Math.random() * 100000) + 1),
      created: 0
    },
    $inc: {passwordVersion: 1},
    $unset: {
      ip: 1,
      about_me: 1,
      show_welcome: 1,
      GDriveRefreshToken: 1,
      banned: 1,
      custom_status: 1,
      email: 1,
      settings: 1,
      avatar: 1,
      password: 1,
      readTerms: 1,
      servers: 1,
      lastSeen: 1,
      status: 1,
      type: 1,
      badges: 1,
    }
  })

  
  // delete files from cdn
  if (req.user.id) {
    const error = await NertiviaCDN.deleteFile("/" + req.user.id);
    if (error) {
      console.log("Error deleting from CDN", error)
    }
  }

  kickUser(req.user.id, "Token outdated.");
  await UserCache.removeUser(req.user.id);

  res
  .status(200)
  .json({status: "Account Deleted!"})



};