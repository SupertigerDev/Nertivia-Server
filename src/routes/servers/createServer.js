
// Models
import {ServerMembers} from "../../models/ServerMembers";
const Channels = require("../../models/channels");
const Servers = require("../../models/servers");
const User = require("../../models/users");
import { ServerRoles } from "../../models/ServerRoles";
const rolePerms = require("../../utils/rolePermConstants");
const { AddFCMUserToServer } = require("../../utils/sendPushNotification");


// Imports
const flake = require('../../utils/genFlakeId').default;


module.exports = async (req, res, next) => {
  const { name } = req.body;
  const userDocID = req.user._id;
  // A user can only create 10 servers.
  const checkLimitExceeded = await Servers.find({ creator: userDocID });

  if (checkLimitExceeded.length >= 10)
    return res.status(403).json({
      message: "Reached the maximum limit of servers."
    });

  const channelID = flake.gen();
  const serverID = flake.gen();
  const createServer = await Servers.create({
    name: name.trim(),
    creator: userDocID,
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
    { _id: userDocID },
    { $push: { servers: createServer._id } }
  );
  const addServerMember = await ServerMembers.create({
    server: createServer._id,
    server_id: createServer.server_id,
    member: userDocID,
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
  const createRole = await ServerRoles.create(roleDoc);

  const roleData = {
    name: roleDoc.name,
    permissions: roleDoc.permissions,
    default: true,
    deletable: false,
    id: roleID,
    server_id: roleDoc.server_id,
    order: 0
  };




  createServerObj.creator = { id: req.user.id };
  createServerObj.__v = undefined;
  createServerObj._id = undefined;
  res.json(createServerObj);
  AddFCMUserToServer(createServer.server_id, req.user.id);
  // send owns status to every connected device
  createServerObj.channels = [createChannel];
  const serverMember = addServerMember.toObject();
  serverMember.member = {
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    id: req.user.id
  };
  serverMember.server_id = createServer.server_id;

  io.in(req.user.id).emit("server:joined", createServerObj);
  io.in(req.user.id).emit("server:create_role", roleData);
  io.in(req.user.id).emit("server:member_add", {
    serverMember: serverMember
  });
  // join room
  io.in(req.user.id).socketsJoin("server:" + createServer.server_id)

};
