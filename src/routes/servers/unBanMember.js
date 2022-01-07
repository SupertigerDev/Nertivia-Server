
import {Servers} from "../../models/Servers";
import { Users } from "../../models/Users";



module.exports = async (req, res, next) => {
  const {server_id, id} = req.params;


  const server = req.server;


  const userToBeUnbanned = await Users.findOne({id: id}).select('username tag avatar id');

  if (!userToBeUnbanned) {
    return res.status(404).json({message: "User doesn't exist."})
  }

  // check if user is banned
  const checkBanned = await Servers.findOne({
    _id: server._id,
    "user_bans.user": userToBeUnbanned._id
  }) 

  if (!checkBanned) {
    return res.status(404).json({message: "User is not banned."})
  }

  await Servers.updateOne(
    {_id: server._id},
    {$pull: {user_bans: {user: userToBeUnbanned._id}}}
  );


  res.json({ status: "Done!" });




  
};


