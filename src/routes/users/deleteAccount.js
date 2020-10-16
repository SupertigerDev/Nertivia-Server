const Users = require("../../models/users");
const nertiviaCDN = require("../../utils/uploadCDN/nertiviaCDN");

const redis = require("../../redis");



module.exports = async (req, res, next) => {
  const { password } = req.body;


  // validate password
  const user = await Users.findById(req.user._id).select("password");
  if (!user){
    return res
    .status(404)
    .json({error: "User could not be found."})
  }

  const passwordMatch = await user.isValidPassword(password);
  if (!passwordMatch) {
    return res
    .status(403)
    .json({error: "Password does not match."})
  }


  // CHECK:
  // Users MUST 
  // leave/delete all servers
  // delete all bots
  
  const botExists = await Users.exists({createdBy: req.user._id});
  if (botExists) {
    return res
    .status(403)
    .json({error: "You must delete all of your bots before deleting your account."})
  }

  const _user = await Users.findById(req.user._id).select("servers");
  if (_user && _user.servers && _user.servers.length) {
    return res
    .status(403)
    .json({error: "You must leave / Delete all of your servers before deleting your account."})
  }



  await Users.updateOne({_id: req.user._id}, {
    $set: {
      username: "Deleted User" + (Math.floor(Math.random() * 100000) + 1),
      created: 0
    },
    $inc: {passwordVersion: 1},
    $unset: {
      ip: 1,
      about_me: 1,
      survey_completed: 1,
      GDriveRefreshToken: 1,
      banned: 1,
      custom_status: 1,
      email: 1,
      settings: 1,
      avatar: 1,
      password: 1,
      readTerms: 1,
      servers: 1,
      lastSeen: 1,
      status: 1,
    }
  })

  
  // delete files from cdn
  nertiviaCDN.deletePath("/" + req.user.uniqueID).catch(err => {console.log("Error deleting from CDN", err)});

  kickUser(req.io, req.user.uniqueID);
  req.session.destroy();

  req
  .status(200)
  .json({status: "Account Deleted!"})



};
async function kickUser(io, uniqueID) {
  await redis.deleteSession(uniqueID);
  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (!rooms || !rooms.sockets) return;

  for (const clientId in rooms.sockets) {
    const client = io.sockets.connected[clientId];
    if (!client) continue;
    client.emit("auth_err", "Token outdated.");
    client.disconnect(true);
  }
}

