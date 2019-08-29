const Notifications = require('./../models/notifications');
const redis = require('./../redis');
module.exports = async (data, client, io) => {
    const {channelID} = data;
    if (!channelID) return; 
    
    const { ok, result, error } = await redis.getConnectedBySocketID(client.id);

    const uniqueID = result.u_id
    await Notifications.deleteOne({recipient: uniqueID, channelID});
    io.to(uniqueID).emit('notification:dismiss', {channelID});

}