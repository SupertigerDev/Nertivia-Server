
import {Servers} from "../../models/Servers";
module.exports = async (req, res, next) => {
  const server = req.server;

  // get banned list
  const serversList = await Servers.findById(server._id, {_id: 0}).select('user_bans').populate({
    path: 'user_bans.user',
    select: 'username tag id avatar -_id'
  }).lean()

  res.json(serversList.user_bans);
  
};


