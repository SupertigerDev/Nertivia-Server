const Users = require("../../models/users");
const BannedIPs = require("../../models/BannedIPs");
const bcrypt = require("bcryptjs");
const sio = require("socket.io");
const redis = require("../../redis");
const { deleteAllUserFCM } = require("../../utils/sendPushNotification");

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
    "ip banned"
  );
  if (!userToSuspend){
    return res.status(404).json({ message: "unique id not found" });
  }

  await deleteAllUserFCM(user_id);  

  const reasonDB = reason.trim() ? reason : "Not Provided.";
  await Users.updateOne(
    { _id: userToSuspend._id },
    { banned: true, $set: { about_me: { "Suspend Reason": reasonDB } } }
  );

  const io = req.io;

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
      const kick_user_id = usersArr[index].id;
      if (kick_user_id === user_id) {
        await kickUser(io, kick_user_id, "You have been suspended for: " + reasonDB);
      } else {
        await kickUser(io, kick_user_id, "IP is banned.");
      }
    }
  }

  res.json("Account Suspended!");
};

/**
 *
 * @param {sio.Server} io
 */
async function kickUser(io, user_id, message) {
  await redis.deleteSession(user_id);

  io.in(user_id).clients((err, clients) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.to(id).emit("auth_err", message);
      io.of('/').adapter.remoteDisconnect(id, true) 
    }
  });
}
