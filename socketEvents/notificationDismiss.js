const Notifications = require('./../models/notifications');
module.exports = async (data, client, io) => {
    const {channelID} = data;
    const {uniqueID} = client.request.user;
    if (!channelID) return; 
    
    const result = await Notifications.deleteOne({recipient: uniqueID, channelID});
    io.to(uniqueID).emit('notification:dismiss', {channelID});

}