const redis = require("../redis");
const PublicServersList = require("../models/publicServersList");
const Servers = require("../models/servers");
const Channels = require("../models/channels");
const MessageQuotes = require("../models/messageQuotes");
const ServerInvites = require("../models/ServerInvites");
const Messages = require("../models/messages");
const Notifications = require('../models/notifications');
const ServerMembers = require("../models/ServerMembers");
const Roles = require("../models/Roles");
const User = require("../models/users");


export default async function deleteServer(io: any, server_id: string, server: any, callback: (err: Error | null, status: Boolean) => void) {

  if (!server) {
    server = await Servers.findOne({server_id}).select("_id server_id");
    if (!server) {
      callback(new Error("Server not found."), false);
      return;
    }
  }

  const channels = await Channels.find({ server: server._id }).lean();
  const channelIDArray = channels.map((c: any) => c.channelID)
  const channel_idArray = channels.map((c: any) => c._id)

  

    await redis.remServerChannels(channelIDArray)
    await redis.delAllServerMembers(server.server_id);
    await redis.deleteServer(server.server_id);
    await Servers.deleteOne({ _id: server._id });
    await PublicServersList.deleteOne({ server: server._id });

    if (channelIDArray) {
      await MessageQuotes.deleteMany({
        quotedChannel: {
          $in: channel_idArray
        }
      })
      await Messages.deleteMany({ channelID: { $in: channelIDArray } });
      await Notifications.deleteMany({ channelID: { $in: channelIDArray } });
    }
    await Channels.deleteMany({ server: server._id });
    await ServerMembers.deleteMany({ server: server._id });
    await ServerInvites.deleteMany({ server: server._id });
    await Roles.deleteMany({ server: server._id });

    await User.updateMany({ $pullAll: { servers: [server._id] } });
    // res.json({ status: "Done!" });
    callback(null, true);

    //EMIT leave event

    io.in("server:" + server.server_id).emit("server:leave", {
      server_id: server.server_id
    });
    io.in("server:" + server.server_id).socketsLeave("server:" + server.server_id)



}