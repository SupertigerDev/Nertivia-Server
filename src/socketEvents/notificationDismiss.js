const channels = require("../models/channels");
const ServerMembers = require("../models/ServerMembers");
const { getConnectedUserBySocketID } = require("../newRedisWrapper");
import { Notifications } from "../models/Notifications";
const redis = require('../redis');
module.exports = async (data, client, io) => {
    const {channelID} = data;
    if (!channelID) return; 
    

    const [user, error] = await getConnectedUserBySocketID(client.id);

    if (error || !user) return;
    
    // server channel
    const serverChannel = await channels.findOne({channelID, server: {$exists: true, $ne: null}}).select("server");
    if (serverChannel) {
       await ServerMembers.updateOne({server: serverChannel.server, member: user._id}, {
            $set: {
                [`last_seen_channels.${channelID}`] : Date.now()
            }
        })

    }
    await Notifications.deleteOne({recipient: user.id, channelID});
    
    io.to(user.id).emit('notification:dismiss', {channelID, serverNotification: !!serverChannel});
}