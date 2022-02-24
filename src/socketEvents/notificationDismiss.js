import { Channels } from "../models/Channels";

import {ServerMembers} from "../models/ServerMembers";
const { getConnectedUserBySocketID } = require("../newRedisWrapper");
import { Notifications } from "../models/Notifications";
import { NOTIFICATION_DISMISSED } from "../ServerEventNames";
const redis = require('../redis');
module.exports = async (data, client, io) => {
    const {channelId} = data;
    if (!channelId) return; 
    

    const [user, error] = await getConnectedUserBySocketID(client.id);

    if (error || !user) return;
    
    // server channel
    const serverChannel = await Channels.findOne({channelId, server: {$exists: true, $ne: null}}).select("server");
    if (serverChannel) {
       await ServerMembers.updateOne({server: serverChannel.server, member: user._id}, {
            $set: {
                [`last_seen_channels.${channelId}`] : Date.now()
            }
        })

    }
    await Notifications.deleteOne({recipient: user.id, channelId});
    
    io.to(user.id).emit(NOTIFICATION_DISMISSED, {channelId, serverNotification: !!serverChannel});
}