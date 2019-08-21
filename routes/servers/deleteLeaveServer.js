// Models
const ServerMembers = require("../../models/ServerMembers");
const Channels = require("../../models/channels");
const Servers = require("../../models/servers");
const User = require("../../models/users");
const ServerInvites = require("../../models/ServerInvites");
const Messages = require("../../models/messages");
const Notifications = require('../../models/notifications');


module.exports = async (req, res, next) => {
  const redis = require("../../redis");
  // check if its the creator and delete the server.

  const channels = await Channels.find({ server: req.server._id });
  let channelIDArray = [];

  for (let index = 0; index < channels.length; index++) {
    channelIDArray.push(channels[index].channelID);
  }

  if (req.server.creator.equals(req.user._id)) {
    await redis.delServer(req.server.server_id);
    await Servers.deleteOne({ _id: req.server._id });
    if (channelIDArray) {
      await Messages.deleteMany({ channelID: { $in: channelIDArray } });
      await Notifications.deleteMany({ channelID: { $in: channelIDArray } });
    }
    await Channels.deleteMany({ server: req.server._id });
    await ServerMembers.deleteMany({ server: req.server._id });
    await ServerInvites.deleteMany({ server: req.server._id });

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
  if (channelIDArray) {
    await Notifications.deleteMany({
      channelID: { $in: channelIDArray },
      recipient: req.user.uniqueID
    });
  }
  await redis.remServerMember(req.user.uniqueID, req.server.server_id);
  await User.updateOne(
    { _id: req.user._id },
    { $pullAll: { servers: [req.server._id] } }
  );
  await ServerMembers.deleteMany({
    member: req.user._id,
    server: req.server._id
  });
  res.json({ status: "Done!" });
  const io = req.io;

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
  // emit message
  const roomsMsg = io.sockets.adapter.rooms["server:" + req.server.server_id];
  if (roomsMsg)
    for (let clientId in roomsMsg.sockets || []) {
      io.to(clientId).emit("receiveMessage", {
        message: messageCreated
      });
    }
};
