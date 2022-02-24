// Models
import {ServerMembers} from "../../models/ServerMembers";
import {Channels} from "../../models/Channels";
import { Users } from "../../models/Users";
import {Messages} from '../../models/Messages'
import { getUserInVoiceByUserId, removeUserFromVoice, removeUserFromVoice } from '../../newRedisWrapper';

import { Notifications } from '../../models/Notifications';
const redis = require("../../redis");

import deleteServer from "../../utils/deleteServer";
import { deleteFCMFromServer, sendServerPush } from "../../utils/sendPushNotification";
import { MESSAGE_CREATED, SERVER_LEFT, SERVER_MEMBER_REMOVED, USER_CALL_LEFT } from "../../ServerEventNames";
module.exports = async (req, res, next) => {
  // check if its the creator and send an error if it is.
  if (req.server.creator === req.user._id) {
    return res.status(403).json({message: "You may delete your server through the server settings page."});
  }

  const channels = await Channels.find({ server: req.server._id }).lean();
  const channelIDArray = channels.map(c => c.channelId)

  // Leave server
  await deleteFCMFromServer(req.server.server_id, req.user.id);

  // delete all leavers notification from the server 
  if (channelIDArray) {
    await Notifications.deleteMany({
      channelId: { $in: channelIDArray },
      recipient: req.user.id
    });
  }


  await redis.remServerMember(req.user.id, req.server.server_id);

  // remove server from users server list.
  await Users.updateOne(
    { _id: req.user._id },
    { $pullAll: { servers: [req.server._id] } }
  );

  // delete member from server members
  await ServerMembers.deleteMany({
    member: req.user._id,
    server: req.server._id
  });
  
  res.json({ status: "Done!" });
  const io = req.io;

  // leave call if inside call
  const [voiceDetails, err] = await getUserInVoiceByUserId(req.user.id);
  if (voiceDetails?.serverId === req.server.server_id) {
    await removeUserFromVoice(req.user.id)
    io.in("server:" + voiceDetails.serverId).emit(USER_CALL_LEFT, {channelId: voiceDetails.channelId, userId: req.user.id})
  }



  // leave room

  io.in(req.user.id).emit(SERVER_LEFT, {
    server_id: req.server.server_id
  });
  io.in(req.user.id).socketsLeave("server:" + req.server.server_id)





  // emit leave event 
  io.in("server:" + req.server.server_id).emit(SERVER_MEMBER_REMOVED, {
    id: req.user.id,
    server_id: req.server.server_id
  });

  // send leave message
  const messageCreate = new Messages({
    channelId: req.server.default_channel_id,
    creator: req.user._id,
    messageID: "placeholder",
    type: 2 // leave message
  });

  let messageCreated = await messageCreate.save();

  
  const user = {
    id: req.user.id,
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    admin: req.user.admin
  };
  messageCreated = messageCreated.toObject();
  messageCreated.creator = user;

  // emit message

  io.in("server:" + req.server.server_id).emit(MESSAGE_CREATED, {
    message: messageCreated
  });

  const defaultChannel = await Channels.findOneAndUpdate({ channelId: req.server.default_channel_id }, { $set: {
    lastMessaged: Date.now()
  }}).lean();

  defaultChannel.server = req.server;
  sendServerPush({
    channel: defaultChannel,
    message: {
      channelId: defaultChannel.channelId,
      message: "left the server",
    },
    sender: user,
    server_id: req.server.server_id
  })

};
