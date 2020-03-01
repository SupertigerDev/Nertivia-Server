const Devices = require("../../models/Devices");

module.exports = async (req, res, next) => {
  const { token } = req.body;
  if (!token.trim()) {
    return res.status(403).json({ message: "Token not provided." });
  }
  try {
    await Devices.create({
      user: req.user._id,
      user_id: req.user.uniqueID,
      platform: "android",
      token
    });
    res.json({ message: "Done" });
  } catch (e) {
    return res.status(403).json({ message: "token already saved." });
  }
};