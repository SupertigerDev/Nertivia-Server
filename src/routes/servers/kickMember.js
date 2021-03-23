
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
    .json({ message: "Why would you kick yourself?" });
  }
  const server = req.server;

  const userToBeKicked = await Users.findOne({uniqueID: unique_id}).select('_id uniqueID username tag avatar admin');


  if (!userToBeKicked) return res
    .status(404)
    .json({ message: "User not found." });
    
  const memberExistsInServer = await ServerMembers.exists({member: userToBeKicked._id, server_id});

  if (!memberExistsInServer) {
    res.json({ status: "Member is already not in the server." });
    return;
  }



  if(userToBeKicked._id.toString() === req.server.creator.toString()) {
    return res
    .status(403)
    .json({ message: "You can't kick the creator of the server." });
  }

  await deleteFCMFromServer(server_id,unique_id);

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
    { _id: userToBeKicked._id },
    { $pullAll: { servers: [server._id] } }
  );


  //if bot, delete bot role
  const role = await Roles.findOneAndDelete({bot: userToBeKicked._id, server: server._id});

  if (role) {
    io.in("server:" + role.server_id).emit("server:delete_role", {role_id: role.id, server_id: role.server_id});
  }

  // delete member from server members
  await ServerMembers.deleteMany({
    member: userToBeKicked._id,
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
    creator: userToBeKicked._id,
    messageID: "placeholder",
    type: 3 // kick message
  });
  let messageCreated = await messageCreate.save();

  messageCreated = messageCreated.toObject();
  messageCreated.creator = userToBeKicked;

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
      message: "has been kicked",
    },
    sender: userToBeKicked,
    server_id: req.server.server_id
  })


  
};


