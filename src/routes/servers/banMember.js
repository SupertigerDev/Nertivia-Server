
const Servers = require("../../models/servers");
const Users = require("../../models/users");
const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Notifications = require("../../models/notifications");
const Channels = require("../../models/channels");
const Roles = require("../../models/Roles");
const redis = require("../../redis");
const { deleteFCMFromServer, sendServerPush } = require("../../utils/sendPushNotification");

module.exports = async (req, res, next) => {
  const {server_id, unique_id} = req.params;


  if (unique_id === req.user.uniqueID) {
    return res
    .status(403)
    .json({ message: "Why would you ban yourself?" });
  }
  const server = req.server;

  // allow members that are not in this server to be banned.
  const userToBeBanned = await Users.findOne({uniqueID: unique_id}).select('_id uniqueID username tag avatar admin');

  if (!userToBeBanned) return res
    .status(404)
    .json({ message: "User not found." });

  const userAlreadyBanned = await Servers.exists({"user_bans.user": userToBeBanned._id, server_id});

  if (userAlreadyBanned) {
    res.json({ status: "Member is already banned." });
    return;
  }

  if(userToBeBanned._id.toString() === req.server.creator.toString()) {
    return res
    .status(403)
    .json({ message: "You can't ban the creator of the server." });
  }

  const isCreator = req.server.creator === req.user._id
  if (!isCreator) {
    // check if requesters role is above the recipients
    const member = await ServerMembers.findOne({ server: req.server._id, member: userToBeBanned._id }).select("roles");
    if (member) {
      const roles = await Roles.find({ id: { $in: member.roles } }, { _id: 0 }).select('order').lean();
      let recipientHighestRolePosition = Math.min(...roles.map(r => r.order));
      if (recipientHighestRolePosition <= req.highestRolePosition) {
        return res
          .status(403)
          .json({ message: "Your Role priority is the same or lower than the recipient." });
      }
    }
  }



  await deleteFCMFromServer(server_id, unique_id);
  await Servers.updateOne(
    {_id: server._id},
    {$push: {user_bans: {user: userToBeBanned._id}}}
  );



  // server channels
  const channels = await Channels.find({ server: server._id });
  const channelIDs = channels.map(channel => channel.channelID)

  // delete all kick-ers notification from the server 
  if (channelIDs) {
    await Notifications.deleteMany({
      channelID: { $in: channelIDs },
      recipient: unique_id
    });
  }

  await redis.remServerMember(unique_id, server_id);
  await redis.remServerChannels(unique_id, channelIDs)
  const io = req.io;
  // remove server from users server list.
  await Users.updateOne(
    { _id: userToBeBanned._id },
    { $pullAll: { servers: [server._id] } }
  );


  //if bot, delete bot role
  const role = await Roles.findOneAndDelete({bot: userToBeBanned._id, server: server._id});

  if (role) {
    io.in("server:" + role.server_id).emit("server:delete_role", {role_id: role.id, server_id: role.server_id});
  }


  // delete member from server members

  await ServerMembers.deleteMany({
    member: userToBeBanned._id,
    server: server._id
  });

  res.json({ status: "Done!" });


  // leave room
  io.in(unique_id).clients((err, clients) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.to(id).emit("server:leave", {
        server_id: server.server_id
      });
      io.of('/').adapter.remoteLeave(id, "server:" + server.server_id)
    }
  });


  // emit leave event 
  io.in("server:" + req.server.server_id).emit("server:member_remove", {
    uniqueID: unique_id,
    server_id: server_id
  });

  // send kick message
  const messageCreate = new Messages({
    channelID: server.default_channel_id,
    creator: userToBeBanned._id,
    messageID: "placeholder",
    type: 4 // ban message
  });
  let messageCreated = await messageCreate.save();

  messageCreated = messageCreated.toObject();
  messageCreated.creator = userToBeBanned;



  // emit message
  io.in("server:" + req.server.server_id).emit("receiveMessage", {
    message: messageCreated
  });

  
  const defaultChannel = await Channels.findOneAndUpdate({ channelID: req.server.default_channel_id }, { $set: {
    lastMessaged: Date.now()
  }}).lean()


  defaultChannel.server = req.server;
  sendServerPush({
    channel: defaultChannel,
    message: {
      channelID: defaultChannel.channelID,
      message: "has been banned",
    },
    sender: userToBeBanned,
    server_id: req.server.server_id
  })




  
};


