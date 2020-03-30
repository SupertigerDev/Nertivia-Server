
const Servers = require("../../models/servers");
const Users = require("../../models/users");
const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Notifications = require("../../models/notifications");
const Channels = require("../../models/channels");
const redis = require("../../redis");

const sendMessageNotification = require('../../utils/SendMessageNotification');

module.exports = async (req, res, next) => {
  const {server_id, unique_id} = req.params;

  if (unique_id === req.user.uniqueID) {
    return res
    .status(403)
    .json({ message: "Why would you kick yourself?" });
  }
  const server = req.server;

  const kicker = await Users.findOne({uniqueID: unique_id}).select('_id uniqueID username tag avatar admin');

  if (!kicker) return res
    .status(404)
    .json({ message: "User not found." });

  if(kicker._id.toString() === req.server.creator.toString()) {
    return res
    .status(403)
    .json({ message: "You can't kick the creator of the server." });
  }

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

  // remove server from users server list.
  await Users.updateOne(
    { _id: kicker._id },
    { $pullAll: { servers: [server._id] } }
  );

  // delete member from server members
  await ServerMembers.deleteMany({
    member: kicker._id,
    server: server._id
  });

  res.json({ status: "Done!" });


  const io = req.io;

  // leave room
  const rooms = io.sockets.adapter.rooms[unique_id];
  if (rooms){
    for (let clientId in rooms.sockets || []) {
      if (io.sockets.connected[clientId]) {
        io.sockets.connected[clientId].emit("server:leave", {
          server_id: server.server_id
        });
        io.sockets.connected[clientId].leave("server:" + server.server_id);
      }
    }
  }

  // emit leave event 
  io.in("server:" + req.server.server_id).emit("server:member_remove", {
    uniqueID: unique_id,
    server_id: server_id
  });

  // send kick message
  const messageCreate = new Messages({
    channelID: server.default_channel_id,
    creator: kicker._id,
    messageID: "placeholder",
    type: 3 // kick message
  });
  let messageCreated = await messageCreate.save();

  messageCreated = messageCreated.toObject();
  messageCreated.creator = kicker;

  // save notification 
  await sendMessageNotification({
    message: messageCreated,
    channelID: req.server.default_channel_id,
    server_id: req.server._id,
    sender: kicker,
  })


  // emit message
  const roomsMsg = io.sockets.adapter.rooms["server:" + req.server.server_id];
  if (roomsMsg){
    for (let clientId in roomsMsg.sockets || []) {
      io.to(clientId).emit("receiveMessage", {
        message: messageCreated
      });
    }
  }



  
};


