const Users = require("../../models/users");
const BannedIPs = require("../../models/BannedIPs");
const bcrypt = require("bcryptjs");
const sio = require("socket.io");
const redis = require("../../redis");

module.exports = async (req, res, next) => {
  const uniqueID = req.params.unique_id;
  const adminPassword = req.body.password;

  // check admin password
  const admin = await Users.findById(req.user._id).select("password");
  const verify = await bcrypt.compare(adminPassword, admin.password);
  if (!verify) return res.status(403).json({ message: "Invalid password" });

  const userToSuspend = await Users.findOne({ uniqueID: uniqueID }).select(
    "ip"
  );
  if (!userToSuspend)
    return res.status(404).json({ message: "unique id not found" });

  await Users.updateOne({ _id: userToSuspend._id }, { banned: true });


  const io = req.io;

  // ban ip
  if (userToSuspend.ip) {
    await BannedIPs.updateOne(
      { ip: userToSuspend.ip },
      {},
      { upsert: true, setDefaultsOnInsert: true }
    );

    // kick everyone with that IP
    const usersArr = await Users.find({ip: userToSuspend.ip }).select("uniqueID");

    for (let index = 0; index < usersArr.length; index++) {
      const uniqueID = usersArr[index].uniqueID;
      await kickUser(io, uniqueID);      
    }
  } 

  res.json("Account Suspended!");
};

/**
 *
 * @param {sio.Server} io
 */
async function kickUser(io, uniqueID) {
  await redis.deleteSession(uniqueID)
  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (!rooms || !rooms.sockets) return;

  for (const clientId in rooms.sockets) {
      const client = io.sockets.connected[clientId];
      if (!client) continue;
      client.emit("auth_err", "IP IS BANNED")
      client.disconnect(true);   
  }
}