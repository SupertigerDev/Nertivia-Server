import { Users } from "../../models/Users";
import {BannedIPs} from "../../models/BannedIPs";
const bcrypt = require("bcryptjs");

const { deleteAllUserFCM } = require("../../utils/sendPushNotification");
import {AdminActions} from "../../models/AdminActions";
const { kickUser } = require("../../utils/kickUser");

module.exports = async (req, res, next) => {
  const user_id = req.params.id;
  const adminPassword = req.body.password;
  const reason = req.body.reason;

  if (!adminPassword) return res.status(403).json({ message: "Invalid password" });

  // check admin password
  const admin = await Users.findById(req.user._id).select("password");
  const verify = await bcrypt.compare(adminPassword, admin.password);
  if (!verify) return res.status(403).json({ message: "Invalid password" });

  const userToSuspend = await Users.findOne({ id: user_id }).select(
    "ip banned type"
  );
  if (!userToSuspend) {
    return res.status(404).json({ message: "unique id not found" });
  }
  if (userToSuspend.type === "CREATOR") {
    return res.status(403).json({ message: "Cannot suspend creator." });
  }

  await deleteAllUserFCM(user_id);

  const reasonDB = reason.trim() ? reason : "Not Provided.";
  await Users.updateOne(
    { _id: userToSuspend._id },
    { banned: true, $set: {about_me: { "Suspend Reason": reasonDB }} } 
  );

  await AdminActions.create({
    action: "SUSPEND_USER",
    admin: req.user._id,
    reason: reasonDB,
    user: userToSuspend._id,
    date: Date.now()
  })
  await AdminActions.create({
    action: "BAN_IP",
    admin: req.user._id,
    bannedIP: userToSuspend.ip,
    date: Date.now()
  })



  // ban ip
  if (userToSuspend.ip) {
    await BannedIPs.updateOne(
      { ip: userToSuspend.ip },
      {},
      { upsert: true, setDefaultsOnInsert: true }
    );

    // kick everyone with that IP
    const usersArr = await Users.find({ ip: userToSuspend.ip }).select(
      "id"
    );


    for (let index = 0; index < usersArr.length; index++) {
      const userToKickID = usersArr[index].id;
      if (userToKickID === user_id) {
        await kickUser(userToKickID, "You have been suspended for: " + reasonDB)
      } else {
        await kickUser(userToKickID, "IP is banned.")
      }
    }
  }

  res.json("Account Suspended!");
};