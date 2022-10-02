import { PublicServers } from '../models/PublicServers';

import { Servers } from "../models/Servers";
import { Channels } from "../models/Channels";
import { MessageQuotes } from '../models/MessageQuotes'
import { ServerInvites } from '../models/ServerInvites'

import { Messages } from '../models/Messages'
import * as ServerCache from '../cache/Server.cache';
import * as VoiceCache from '../cache/Voice.cache';
import * as ChannelCache from '../cache/Channel.cache';
import * as ServerMemberCache from '../cache/ServerMember.cache';

import { Notifications } from '../models/Notifications';
import { ServerMembers } from "../models/ServerMembers";
import { ServerRoles } from '../models/ServerRoles';
import { Users } from "../models/Users";
import { SERVER_LEFT } from '../ServerEventNames';

export default async function deleteServer(io: any, server_id: string, server: any, callback: (err: Error | null, status: Boolean) => void) {

  if (!server) {
    server = await Servers.findOne({ server_id }).select("_id server_id");
    if (!server) {
      callback(new Error("Server not found."), false);
      return;
    }
  }

  const channels = await Channels.find({ server: server._id }).lean();
  const channelIds = channels.map((channel) => channel.channelId)
  const channelObjectIds = channels.map((channel) => channel._id)



  await VoiceCache.removeAllServerUsers(server_id);
  await ChannelCache.deleteServerChannelsById(channelIds)
  await ServerMemberCache.deleteAllServerMembers(server.server_id);
  await ServerCache.deleteServer(server.server_id);
  
  await Servers.deleteOne({ _id: server._id });
  await PublicServers.deleteOne({ server: server._id });

  if (channelIds) {
    await MessageQuotes.deleteMany({
      quotedChannel: {
        $in: channelObjectIds
      }
    })
    await Messages.deleteMany({ channelId: { $in: channelIds } });
    await Notifications.deleteMany({ channelId: { $in: channelIds } });
  }
  await Channels.deleteMany({ server: server._id });
  await ServerMembers.deleteMany({ server: server._id });
  await ServerInvites.deleteMany({ server: server._id });
  await ServerRoles.deleteMany({ server: server._id });

  await Users.updateMany({ $pullAll: { servers: [server._id] } });
  callback(null, true);

  //EMIT leave event

  io.in("server:" + server.server_id).emit(SERVER_LEFT, {
    server_id: server.server_id
  });
  io.in("server:" + server.server_id).socketsLeave("server:" + server.server_id)



}