const Friends = require("../models/friends");
const Users = require("../models/users");
const Messages = require("../models/messages");
const Channels = require("../models/channels");

module.exports = async (req, res, next) => {


    const redis = require('../redis');

    const {channelID}  = req.params;


    // check if channel exists
    //redis
    let channel = await redis.getChannel(channelID, req.user.uniqueID )
 
    if (!channel.result){
      // mongodb
      channel = await Channels.findOne({channelID, creator: req.user.id}).populate('recipients');
      if ( !channel ){
        return res.status(403)
          .json( { status: false, message: "Channel does not exist."} );
      } else {
        await redis.addChannel(channelID, channel, req.user.uniqueID)
      }
    } else {
      channel = JSON.parse(channel.result)
    }


 
    res.status(200).send("");

    // emit to users

    const io = req.io


    for (let recipients of channel.recipients) {
      io.in(recipients.uniqueID).emit('typingStatus', {channelID, userID: req.user.uniqueID});
    }



}