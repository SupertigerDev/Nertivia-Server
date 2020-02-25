const Notifications = require('./../models/notifications');
const redis = require('./../redis');
module.exports = async (data, client, io) => {
    const {channelID} = data;
    if (!channelID) return; 
    
    const { ok, result, error } = await redis.getConnectedBySocketID(client.id);
    if (!ok || !result) return;
    
    const uniqueID = result.u_id
    const del = await Notifications.deleteOne({recipient: uniqueID, channelID});
    if (del.deletedCount >= 1) {
        io.to(uniqueID).emit('notification:dismiss', {channelID});
    }

}