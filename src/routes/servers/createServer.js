
// Models
import {ServerMembers} from "../../models/ServerMembers";
import {Channels, ChannelType} from "../../models/Channels";
import {Servers} from "../../models/Servers";
import { Users } from "../../models/Users";
import { ServerRoles } from "../../models/ServerRoles";
import { SERVER_JOINED, SERVER_ROLE_CREATED, SERVER_MEMBER_ADDED  } from "../../ServerEventNames";
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

  const channelId = flake.gen();
  const serverID = flake.gen();
  const createServer = await Servers.create({
    name: name.trim(),
    creator: userDocID,
    default_channel_id: channelId,
    server_id: serverID,
  });

  const createServerObj = createServer.toObject();

  const createChannel = await Channels.create({
    name: "General",
    type: ChannelType.SERVER_CHANNEL,
    channelId: channelId,
    server: createServer._id,
    server_id: serverID,
    lastMessaged: Date.now()
  });

  const addServerUser = await Users.updateOne(
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

  io.in(req.user.id).emit(SERVER_JOINED, createServerObj);
  io.in(req.user.id).emit(SERVER_ROLE_CREATED, roleData);
  io.in(req.user.id).emit(SERVER_MEMBER_ADDED, {
    serverMember: serverMember
  });
  // join room
  io.in(req.user.id).socketsJoin("server:" + createServer.server_id)

};
