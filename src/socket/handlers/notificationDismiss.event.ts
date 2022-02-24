import { Socket } from "socket.io";
import { Channels } from "../../models/Channels";
import { Notifications } from "../../models/Notifications";
import { ServerMembers } from "../../models/ServerMembers";
import { NOTIFICATION_DISMISSED } from "../../ServerEventNames";
import { getIOInstance } from "../socket";

import * as UserCache from '../../cache/User.cache';
interface Data {
  channelId: string
}

export async function onNotificationDismiss(client: Socket, data: Data) {

  if (!data.channelId) return; 


  const [user, error] = await UserCache.getUserBySocketId(client.id);

  if (error || !user) return;

  // server channel
  const serverChannel = await Channels.findOne({channelId: data.channelId, server: {$exists: true, $ne: null}}).select("server");
  if (serverChannel) {
    await ServerMembers.updateOne({server: serverChannel.server, member: user._id}, {
      $set: {
        [`last_seen_channels.${data.channelId}`] : Date.now()
      }
    })

  }
  await Notifications.deleteOne({recipient: user.id, channelId: data.channelId});

  getIOInstance().to(user.id).emit(NOTIFICATION_DISMISSED, {channelId: data.channelId, serverNotification: !!serverChannel});

}