import { Users } from "../../models/Users";
import {BannedIPs} from "../../models/BannedIPs";

const bcrypt = require("bcryptjs");

import {AdminActions} from "../../models/AdminActions";

module.exports = async (req, res, next) => {
  const user_id = req.params.id;
  const removeIPBan = req.params.removeIPBan;
  const adminPassword = req.body.password;

  if (!adminPassword) return res.status(403).json({ message: "Invalid password" });

  // check admin password
  const admin = await Users.findById(req.user._id).select("password");
  const verify = await bcrypt.compare(adminPassword, admin.password);
  if (!verify) return res.status(403).json({ message: "Invalid password" });

  const userToUnsuspend = await Users.findOne({ id: user_id }).select(
    "ip banned type"
  );
  if (!userToUnsuspend) {
    return res.status(404).json({ message: "user not found" });
  }
  if (!userToUnsuspend.banned) {
    return res.status(403).json({ message: "User is not suspended." });
  }


  await Users.updateOne(
    { _id: userToUnsuspend._id },
    {$unset: {banned: 1, about_me: {"Suspend Reason": 1}}}
  );

  await AdminActions.create({
    action: "UNSUSPEND_USER",
    admin: req.user._id,
    user: userToUnsuspend._id,
    date: Date.now()
  })
  await AdminActions.create({
    action: "UNBAN_IP",
    admin: req.user._id,
    bannedIP: userToUnsuspend.ip,
    date: Date.now()
  })

  if (removeIPBan && userToUnsuspend.ip) {
    await BannedIPs.deleteOne({ip: userToUnsuspend.ip})
  }
  res.json("Account Suspended!");
};