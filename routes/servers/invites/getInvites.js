const ServerInvites = require("../../../models/ServerInvites");


module.exports = async (req, res, next) => {
  const invites = await ServerInvites.find({
    server: req.server._id,
    creator: req.user._id
  });
  res.json(invites);
};
