const Users = require("../../models/users");
const BannedIPs = require("../../models/BannedIPs");
const bcrypt = require("bcryptjs");

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

  // ban ip
  if (userToSuspend.ip) {
    await BannedIPs.updateOne(
      { ip: userToSuspend.ip },
      {},
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  const redis = require("../../redis");
  await redis.deleteSession(uniqueID)

  const io = req.io;

  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (rooms){
    for (let clientId in rooms.sockets || []) {
      if (io.sockets.connected[clientId]) {
        io.sockets.connected[clientId].emit("auth_err", "IP Banned")
        io.sockets.connected[clientId].disconnect()
      }
    }
  }

  res.json("");
};
