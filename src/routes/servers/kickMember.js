
import { Users } from "../../models/Users";
import {ServerMembers} from "../../models/ServerMembers";
import {Messages} from '../../models/Messages'
import { deleteServerChannels, getUserInVoiceByUserId, removeUserFromVoice } from '../../newRedisWrapper';

import { Notifications } from '../../models/Notifications';
import {Channels} from "../../models/Channels";
import { ServerRoles } from '../../models/ServerRoles';
import { MESSAGE_CREATED, SERVER_LEFT, SERVER_MEMBER_REMOVED, SERVER_ROLE_DELETED, USER_CALL_LEFT } from "../../ServerEventNames";
const redis = require("../../redis");
const { deleteFCMFromServer, sendServerPush } = require("../../utils/sendPushNotification");

module.exports = async (req, res, next) => {
  const { server_id, id } = req.params;

  if (id === req.user.id) {
    return res
      .status(403)
      .json({ message: "Why would you kick yourself?" });
  }
  const server = req.server;

  const userToBeKicked = await Users.findOne({ id: id }).select('_id id username tag avatar admin');


  if (!userToBeKicked) return res
    .status(404)
    .json({ message: "User not found." });

  const memberExistsInServer = await ServerMembers.exists({ member: userToBeKicked._id, server_id });

  if (!memberExistsInServer) {
    res.json({ status: "Member is already not in the server." });
    return;
  }



  if (userToBeKicked._id.toString() === req.server.creator.toString()) {
    return res
      .status(403)
      .json({ message: "You can't kick the creator of the server." });
  }


  const isCreator = req.server.creator === req.user._id
  if (!isCreator) {
    // check if requesters role is above the recipients
    const member = await ServerMembers.findOne({ server: req.server._id, member: userToBeKicked._id }).select("roles");
    if (member) {
      const roles = await ServerRoles.find({ id: { $in: member.roles } }, { _id: 0 }).select('order').lean();
      let recipientHighestRolePosition = Math.min(...roles.map(r => r.order));
      if (recipientHighestRolePosition <= req.highestRolePosition) {
        return res
          .status(403)
          .json({ message: "Your Role priority is the same or lower than the recipient." });
      }
    }
  }



  await deleteFCMFromServer(server_id, id);

  // server channels
  const channels = await Channels.find({ server: server._id });
  const channelIDs = channels.map(channel => channel.channelId)

  // delete all kick-ers notification from the server 
  if (channelIDs) {
    await Notifications.deleteMany({
      channelId: { $in: channelIDs },
      recipient: id
    });
  }

  await redis.remServerMember(id, server_id);
  await deleteServerChannels(id, channelIDs)
  const io = req.io;
  // remove server from users server list.
  await Users.updateOne(
    { _id: userToBeKicked._id },
    { $pullAll: { servers: [server._id] } }
  );


  //if bot, delete bot role
  const role = await ServerRoles.findOneAndDelete({ bot: userToBeKicked._id, server: server._id });

  if (role) {
    io.in("server:" + role.server_id).emit(SERVER_ROLE_DELETED, { role_id: role.id, server_id: role.server_id });
  }

  // delete member from server members
  await ServerMembers.deleteMany({
    member: userToBeKicked._id,
    server: server._id
  });

  res.json({ status: "Done!" });




  // leave call if inside call
  const [voiceDetails, err] = await getUserInVoiceByUserId(id);
  if (voiceDetails?.serverId === server_id) {
    await removeUserFromVoice(id)
    io.in("server:" + voiceDetails.serverId).emit(USER_CALL_LEFT, {channelId: voiceDetails.channelId, userId: id})
  }



  // leave room

  
  io.in(id).emit(SERVER_LEFT, {
    server_id: server.server_id
  });
  io.in(id).socketsLeave("server:" + server.server_id)




  // emit leave event 
  io.in("server:" + req.server.server_id).emit(SERVER_MEMBER_REMOVED, {
    id: id,
    server_id: server_id
  });

  // send kick message
  const messageCreate = new Messages({
    channelId: server.default_channel_id,
    creator: userToBeKicked._id,
    messageID: "placeholder",
    type: 3 // kick message
  });
  let messageCreated = await messageCreate.save();

  messageCreated = messageCreated.toObject();
  messageCreated.creator = userToBeKicked;

  // emit message

  io.in("server:" + req.server.server_id).emit(MESSAGE_CREATED, {
    message: messageCreated
  });


  const defaultChannel = await Channels.findOneAndUpdate({ channelId: req.server.default_channel_id }, {
    $set: {
      lastMessaged: Date.now()
    }
  }).lean()

  defaultChannel.server = req.server;
  sendServerPush({
    channel: defaultChannel,
    message: {
      channelId: defaultChannel.channelId,
      message: "has been kicked",
    },
    sender: userToBeKicked,
    server_id: req.server.server_id
  })



};


