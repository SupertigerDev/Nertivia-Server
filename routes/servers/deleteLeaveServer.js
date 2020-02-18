// Models
const ServerMembers = require("../../models/ServerMembers");
const Channels = require("../../models/channels");
const Servers = require("../../models/servers");
const User = require("../../models/users");
const ServerInvites = require("../../models/ServerInvites");
const Messages = require("../../models/messages");
const Notifications = require('../../models/notifications');
const PublicServersList = require("../../models/publicServersList");
const Roles = require("../../models/Roles");

const sendMessageNotification = require('./../../utils/SendMessageNotification')

module.exports = async (req, res, next) => {
  const redis = require("../../redis");
  // check if its the creator and delete the server.

  const channels = await Channels.find({ server: req.server._id });
  const channelIDArray = channels.map(c => c.channelID)

  if (req.server.creator === req.user._id) {
    await redis.remServerChannels(channelIDArray)
    await redis.delAllServerMembers(req.server.server_id);
    await redis.deleteServer(req.server.server_id);
    await Servers.deleteOne({ _id: req.server._id });
    await PublicServersList.deleteOne({ server: req.server._id });

    if (channelIDArray) {
      await Messages.deleteMany({ channelID: { $in: channelIDArray } });
      await Notifications.deleteMany({ channelID: { $in: channelIDArray } });
    }
    await Channels.deleteMany({ server: req.server._id });
    await ServerMembers.deleteMany({ server: req.server._id });
    await ServerInvites.deleteMany({ server: req.server._id });
    await Roles.deleteMany({ server: req.server._id });

    await User.updateMany({ $pullAll: { servers: [req.server._id] } });
    res.json({ status: "Done!" });

    //EMIT
    const io = req.io;
    const rooms = io.sockets.adapter.rooms["server:" + req.server.server_id];
    if (rooms)
      for (let clientId in rooms.sockets || []) {
        io.sockets.connected[clientId].emit("server:leave", {
          server_id: req.server.server_id
        });
        io.sockets.connected[clientId].leave("server:" + req.server.server_id);
      }
    return;
  }


  // Leave server

  // delete all leavers notification from the server 
  if (channelIDArray) {
    await Notifications.deleteMany({
      channelID: { $in: channelIDArray },
      recipient: req.user.uniqueID
    });
  }


  await redis.remServerMember(req.user.uniqueID, req.server.server_id);

  // remove server from users server list.
  await User.updateOne(
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


  // leave room
  const rooms = io.sockets.adapter.rooms[req.user.uniqueID];
  if (rooms)
    for (let clientId in rooms.sockets || []) {
      if (io.sockets.connected[clientId]) {
        io.sockets.connected[clientId].emit("server:leave", {
          server_id: req.server.server_id
        });
        io.sockets.connected[clientId].leave("server:" + req.server.server_id);
      }
    }

  // emit leave event 
  io.in("server:" + req.server.server_id).emit("server:member_remove", {
    uniqueID: req.user.uniqueID,
    server_id: req.server.server_id
  });

  // send leave message
  const messageCreate = new Messages({
    channelID: req.server.default_channel_id,
    creator: req.user._id,
    messageID: "placeholder",
    type: 2 // leave message
  });

  let messageCreated = await messageCreate.save();
  const user = {
    uniqueID: req.user.uniqueID,
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    admin: req.user.admin
  };
  messageCreated = messageCreated.toObject();
  messageCreated.creator = user;

  // save notification 
  await sendMessageNotification({
    message: messageCreated,
    channelID: req.server.default_channel_id,
    server_id: req.server._id,
    sender: req.user,
  })

  // emit message
  const roomsMsg = io.sockets.adapter.rooms["server:" + req.server.server_id];
  if (roomsMsg)
    for (let clientId in roomsMsg.sockets || []) {
      io.to(clientId).emit("receiveMessage", {
        message: messageCreated
      });
    }


};
