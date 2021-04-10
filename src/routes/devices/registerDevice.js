const Devices = require("../../models/Devices");
const Servers = require("../../models/servers");
const Users = require("../../models/users");

module.exports = async (req, res, next) => {
  const { token } = req.body;
  if (!token || !token.trim()) {
    return res.status(403).json({ message: "Token not provided." });
  }

  try {
    const saveDevice = await Devices.create({
      user: req.user._id,
      user_id: req.user.id,
      platform: "android",
      token
    });
    

    // // add device to servers;
    const user = await Users.findById(req.user._id).select("servers");
    if (user.servers.length){
      await Servers.updateMany({_id: {$in: user.servers}}, {$addToSet: {FCM_devices: saveDevice._id}})
    }

    res.json({ message: "Done" });
  } catch (e) {
    return res.status(403).json({ message: "token already saved." });
  }
};