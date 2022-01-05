const redis = require("../redis");
import {PublicServers} from '../models/PublicServers';

import {Servers} from "../models/Servers";
const Channels = require("../models/channels");
import {MessageQuoteModel} from '../models/MessageQuote'
import {ServerInvites} from '../models/ServerInvites'

import {Messages} from '../models/Messages'
import { deleteServerChannels, deleteServer as deleteServerRedis, deleteAllServerVoice } from '../newRedisWrapper';

import { Notifications } from '../models/Notifications';
import {ServerMembers} from "../models/ServerMembers";
import { ServerRoles } from '../models/ServerRoles';
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

  

  await deleteAllServerVoice(server_id);


    await deleteServerChannels(channelIDArray)
    await redis.delAllServerMembers(server.server_id);
    await deleteServerRedis(server.server_id);
    await Servers.deleteOne({ _id: server._id });
    await PublicServers.deleteOne({ server: server._id });

    if (channelIDArray) {
      await MessageQuoteModel.deleteMany({
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
    await ServerRoles.deleteMany({ server: server._id });

    await User.updateMany({ $pullAll: { servers: [server._id] } });
    // res.json({ status: "Done!" });
    callback(null, true);

    //EMIT leave event

    io.in("server:" + server.server_id).emit("server:leave", {
      server_id: server.server_id
    });
    io.in("server:" + server.server_id).socketsLeave("server:" + server.server_id)



}