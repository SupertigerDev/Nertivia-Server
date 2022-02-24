import { Request, Response } from 'express'

import {Channels} from "../models/Channels";
import { Users } from "../models/Users";

import {ServerInvites} from '../models/ServerInvites'
import {Messages} from '../models/Messages'

import {ServerMembers} from "../models/ServerMembers";
import { ServerRoles } from '../models/ServerRoles';
import { AddFCMUserToServer, sendServerPush } from "./sendPushNotification";
import getUserDetails from "./getUserDetails";
import { getCustomStatusByUserId, getPresenceByUserId, getVoiceUsersFromServerIds } from '../newRedisWrapper';
import { MESSAGE_CREATED, SERVER_JOINED, SERVER_MEMBERS, SERVER_MEMBER_ADDED, SERVER_ROLES } from '../ServerEventNames';


export default async function join(server: any, user: any, socketID: string | undefined, req: Request, res: Response, roleId: string | undefined, type: string = "MEMBER") {
  

  const invite_code:string = server.invite_code;

  if (server.invite_code) {
    server = server.server;
  }


  // check if user is already joined
  const joined = await Users.exists({
    _id: user._id,
    servers: server._id
  });

  const joined2 = await ServerMembers.exists({
    member: user._id,
    server_id: server.server_id
  })
  
  
  if (joined || joined2) return res.status(409).json({ message: "Already joined!" });




  const updatedUser = await Users.updateOne(
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
    await Users.updateOne(
      { _id: user._id },
      { $pullAll: { servers: [server.server_id] } }
    );
  })
  if (!createdServerMember) return;


  let serverChannels = await Channels.find({
    server: server._id
  })
  .select("name type channelId categoryId server server_id lastMessaged rateLimit icon")
  .lean();

  const createServerObj = Object.assign({}, server);
  createServerObj.creator = { id: createServerObj.creator.id };
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
      id: user.id
    }
  };
  // get user presence
  const [presence] = await getPresenceByUserId(serverMember.member.id);
  const [customStatus] = await getCustomStatusByUserId(serverMember.member.id);
  io.in("server:" + server.server_id).emit(SERVER_MEMBER_ADDED, {
    serverMember,
    custom_status: customStatus[1],
    presence: presence[1]
  });
  // get joined voice users
  const [callingChannelUserIds] = await getVoiceUsersFromServerIds([server.server_id])

  // send owns status to every connected device
  createServerObj.channels = serverChannels;

  // join room

  // Which one is better? (1)
  io.in(user.id).socketsJoin("server:" + createServerObj.server_id)
  io.in(user.id).emit(SERVER_JOINED, {...createServerObj, socketID})



  // send join message

  const messageCreate = new Messages({
    channelId: server.default_channel_id,
    creator: user._id,
    messageID: "placeholder",
    type: 1 // join message
  });

  let messageCreated: any = await messageCreate.save();
  user = {
    id: user.id,
    username: user.username,
    tag: user.tag,
    avatar: user.avatar,
    admin: user.admin
  };
  messageCreated = messageCreated.toObject();
  messageCreated.creator = user;

  // emit message
  io.in("server:" + createServerObj.server_id).emit(MESSAGE_CREATED, {
    message: messageCreated
  });

  await Channels.updateOne({ channelId: server.default_channel_id }, { $set: {
    lastMessaged: Date.now()
  }})
  
  const defaultChannel = serverChannels.find((c:any) => c.channelId === server.default_channel_id);
  if (defaultChannel) {
    defaultChannel.server = server;
  }


  await AddFCMUserToServer(server.server_id, user.id)

  sendServerPush({
    channel: defaultChannel,
    message: {
      channelId: server.default_channel_id,
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

  io.to(user.id).emit(SERVER_ROLES, {
    server_id: server.server_id,
    roles: serverRoles
  });

  // send members list
  let serverMembers = await ServerMembers.find({ server: server._id })
    .populate("member", "username tag avatar id bot")
    .lean();

  const  {programActivityArr, memberStatusArr, customStatusArr} = await getUserDetails(serverMembers.map((sm: any) => sm.member.id))   

  serverMembers = serverMembers.map((sm: any) => {
    delete sm.server;
    delete sm._id;
    delete sm.__v;
    sm.server_id = server.server_id;
    return sm;
  });
  io.to(user.id).emit(SERVER_MEMBERS, {
    serverMembers,
    memberPresences: memberStatusArr,
    memberCustomStatusArr: customStatusArr,
    programActivityArr,
    callingChannelUserIds
  });


  // increment invite code uses
  if (invite_code) {
    await ServerInvites.updateOne({invite_code}, {$inc: {uses: 1}})
  }
}