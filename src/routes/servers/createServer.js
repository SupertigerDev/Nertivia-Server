
// Models
const ServerMembers = require("../../models/ServerMembers");
const Channels = require("../../models/channels");
const Servers = require("../../models/servers");
const User = require("../../models/users");
const Roles = require("../../models/Roles");
const rolePerms = require("../../utils/rolePermConstants");
const { AddFCMUserToServer } = require("../../utils/sendPushNotification");


// Imports
const flake = require('../../utils/genFlakeId').default;


module.exports = async (req, res, next) => {
  const { name } = req.body;
  const user_id = req.user._id;
  // A user can only create 10 servers.
  const checkLimitExceeded = await Servers.find({ creator: user_id });

  if (checkLimitExceeded.length >= 10)
    return res.status(403).json({
      message: "Reached the maximum limit of servers."
    });

  const channelID = flake.gen();
  const serverID = flake.gen();
  const createServer = await Servers.create({
    name: name.trim(),
    creator: user_id,
    default_channel_id: channelID,
    server_id: serverID,
  });

  const createServerObj = createServer.toObject();

  const createChannel = await Channels.create({
    name: "General",
    channelID: channelID,
    server: createServer._id,
    server_id: serverID,
    lastMessaged: Date.now()
  });

  const addServerUser = await User.updateOne(
    { _id: user_id },
    { $push: { servers: createServer._id } }
  );
  const addServerMember = await ServerMembers.create({
    server: createServer._id,
    server_id: createServer.server_id,
    member: user_id,
    type: "OWNER"
  });


  
  const io = req.io;

  // create default role
  const roleID = flake.gen();

  const roleDoc = {
    name: "Online",
    id: roleID,
    permissions: rolePerms.roles.SEND_MESSAGES,
    server: createServer._id,
    server_id: createServer.server_id,
    default: true,
    deletable: false,
    order: 0
  };
  const createRole = await Roles.create(roleDoc);

  const roleData = {
    name: roleDoc.name,
    permissions: roleDoc.permissions,
    default: true,
    deletable: false,
    id: roleID,
    server_id: roleDoc.server_id,
    order: 0
  };




  createServerObj.creator = { uniqueID: req.user.uniqueID };
  createServerObj.__v = undefined;
  createServerObj._id = undefined;
  res.json(createServerObj);
  AddFCMUserToServer(createServer.server_id, req.user.uniqueID);
  // send owns status to every connected device
  createServerObj.channels = [createChannel];
  const serverMember = addServerMember.toObject();
  serverMember.member = {
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    uniqueID: req.user.uniqueID
  };
  serverMember.server_id = createServer.server_id;

  io.in(req.user.uniqueID).emit("server:joined", createServerObj);
  io.in(req.user.uniqueID).emit("server:create_role", roleData);
  io.in(req.user.uniqueID).emit("server:member_add", {
    serverMember: serverMember
  });
  // join room

  io.in(req.user.uniqueID).clients((err, clients) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.of('/').adapter.remoteJoin(id, "server:" + createServer.server_id);
    }
  });

};
