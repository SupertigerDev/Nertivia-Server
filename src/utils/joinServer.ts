import { Request, Response } from 'express'

const Channels = require("../models/channels");
const User = require("../models/users");
const ServerInvites = require("../models/ServerInvites");
const Messages = require("../models/messages");
const ServerMembers = require("../models/ServerMembers");
const ServerRoles = require("../models/Roles");
const redis = require("../redis");
import { AddFCMUserToServer, sendServerPush } from "./sendPushNotification";
import getUserDetails from "./getUserDetails";

export default async function join(server: any, user: any, socketID: string | undefined, req: Request, res: Response, roleId: string | undefined, type: string = "MEMBER") {
  

  const invite_code:string = server.invite_code;

  if (server.invite_code) {
    server = server.server;
  }


  // check if user is already joined
  const joined = await User.exists({
    _id: user._id,
    servers: server._id
  });

  const joined2 = await ServerMembers.exists({
    member: user._id,
    server_id: server.server_id
  })
  
  
  if (joined || joined2) return res.status(409).json({ message: "Already joined!" });




  const updatedUser = await User.updateOne(
    { _id: user._id },
    { $push: { servers: server._id } }
  ).catch(() => {res.status(403).json({ message: "Something went wrong while upading user." })})
  if (!updatedUser) return;

  const createdServerMember = await ServerMembers.create({
    server: server._id,
    member: user._id,
    roles: [roleId],
    server_id: server.server_id,
    type: type,
  }).catch(async () => {
    res.status(403).json({ message: "Something went wrong while creating server member." });
    await User.updateOne(
      { _id: user._id },
      { $pullAll: { servers: [server.server_id] } }
    );
  })
  if (!createdServerMember) return;


  let serverChannels = await Channels.find({
    server: server._id
  }).lean();

  const createServerObj = Object.assign({}, server);
  createServerObj.creator = { uniqueID: createServerObj.creator.id, id: createServerObj.creator.id };
  createServerObj.__v = undefined;
  createServerObj._id = undefined;

  res.json(createServerObj);

  const io = req.io;

  const serverMember = {
    server_id: server.server_id,
    type: type,
    roles: [roleId],
    member: {
      username: user.username,
      tag: user.tag,
      avatar: user.avatar,
      uniqueID: user.id,
      id: user.id
    }
  };
  // get user presence
  const presence = await redis.getPresence(serverMember.member.id);
  const customStatus = await redis.getCustomStatus(serverMember.member.id);
  io.in("server:" + server.server_id).emit("server:member_add", {
    serverMember,
    custom_status: customStatus.result[1],
    presence: presence.result[1]
  });

  // send owns status to every connected device
  createServerObj.channels = serverChannels;

  // join room
  io.in(user.id).clients((err: any, clients: string[]) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.to(id).emit(
        "server:joined",
        socketID ? {...createServerObj, socketID } : createServerObj
      );
      (io.of('/').adapter as any).remoteJoin(id, "server:" + createServerObj.server_id)
    }
  });

  // send join message

  const messageCreate = new Messages({
    channelID: server.default_channel_id,
    creator: user._id,
    messageID: "placeholder",
    type: 1 // join message
  });

  let messageCreated = await messageCreate.save();
  user = {
    uniqueID: user.id,
    id: user.id,
    username: user.username,
    tag: user.tag,
    avatar: user.avatar,
    admin: user.admin
  };
  messageCreated = messageCreated.toObject();
  messageCreated.creator = user;

  // emit message
  io.in("server:" + createServerObj.server_id).emit("receiveMessage", {
    message: messageCreated
  });

  await Channels.updateOne({ channelID: server.default_channel_id }, { $set: {
    lastMessaged: Date.now()
  }})
  
  const defaultChannel = serverChannels.find((c:any) => c.channelID === server.default_channel_id);
  defaultChannel.server = server;


  await AddFCMUserToServer(server.server_id, user.id)

  sendServerPush({
    channel: defaultChannel,
    message: {
      channelID: server.default_channel_id,
      message: user.username + " joined the server",
    },
    sender: user,
    server_id: server.server_id
  })
  


  // send roles
  let serverRoles = await ServerRoles.find(
    { server: server._id },
    { _id: 0 }
  ).select("name id color permissions server_id deletable order default hideRole");

  io.to(user.id).emit("server:roles", {
    server_id: server.server_id,
    roles: serverRoles
  });

  // send members list
  let serverMembers = await ServerMembers.find({ server: server._id })
    .populate("member", "username tag avatar uniqueID id bot")
    .lean();

  const  {programActivityArr, memberStatusArr, customStatusArr} = await getUserDetails(serverMembers.map((sm: any) => sm.member.id))   

  serverMembers = serverMembers.map((sm: any) => {
    delete sm.server;
    delete sm._id;
    delete sm.__v;
    sm.server_id = server.server_id;
    return sm;
  });
  io.to(user.id).emit("server:members", {
    serverMembers,
    memberPresences: memberStatusArr,
    memberCustomStatusArr: customStatusArr,
    programActivityArr
  });


  // increment invite code uses
  if (invite_code) {
    await ServerInvites.updateOne({invite_code}, {$inc: {uses: 1}})
  }
}