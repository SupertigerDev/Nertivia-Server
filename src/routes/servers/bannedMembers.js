
const Servers = require("../../models/servers");
module.exports = async (req, res, next) => {
  // check if this function is executed by the guild owner.
  if (req.server.creator !== req.user._id){
    return res
    .status(403)
    .json({ message: "You do not have permission to view this data." });
  }

  const server = req.server;

  // get banned list
  const serversList = await Servers.findById(server._id, {_id: 0}).select('user_bans -user_bans._id').populate({
    path: 'user_bans.user',
    select: 'username tag uniqueID avatar -_id'
  }).lean()

  res.json(serversList.user_bans);
  
};


