const Friends = require("../models/friends");
const Users = require("../models/users");
const Messages = require("../models/messages");
const Channels = require("../models/channels");
const Notifications = require('./../models/notifications');

module.exports = {
  get: async (req, res, next) => {
    const {channelID}  = req.params;
    const continueChannelID = req.query.continue;


    // check if channel exists
    const channel = await Channels.findOne({channelID, creator: req.user.id});
    if ( !channel ){
      return res.status(403)
        .json( { status: false, message: "Channel does not exist."} );
    }

    // Get messages
    let messages;
    if (continueChannelID) {
      // check if continue param is entered
      const continueFromMessage = await Messages.findOne({messageID: continueChannelID});
      if (!continueFromMessage){
        return res.status(403)
        .json( { status: false, message: "continue message was not found."} );
      }
      messages = await Messages.find({channelID, '_id': {'$lt': continueFromMessage.id } }).sort({ _id: -1 }).populate({
        path: 'creator',
        select: '-_id -id  -__v -email -friends -status -created -lastSeen'
      }).limit(50).lean();
    } else {
      messages = await Messages.find({channelID},'-__v -_id').populate({
        path: 'creator',
        select: '-_id -id  -__v -email -friends -status -created -lastSeen'
      }).sort({ _id: -1 }).limit(50).lean();
    }

    return res
      .json( { status: true, channelID, messages} );

  },

  post: async (req, res, next) => {

    const redis = require('../redis');

    const {channelID}  = req.params;
    const {tempID, message, socketID} = req.body;


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

    if (message.length > 5000) {
      return res.status(403)
        .json( { status: false, message: "Message must contain characters less than 5,000"} );
    }

    const messageCreate = new Messages({
      channelID,
      message,
      creator: req.user.id,
      messageID: "placeholder"
    });

    let messageCreated = await messageCreate.save();

    const user = {
      uniqueID: req.user.uniqueID,
      username: req.user.username,
      tag: req.user.tag,
      avatar: req.user.avatar
    }
    messageCreated = {
      channelID,
      message,
      creator: user,
      created: messageCreated.created,
      messageID: messageCreated.messageID
    }


    res.json( { status: true,tempID, messageCreated} );

    // emit
    const io = req.io
    // Loop for other users logged in to the same account and emit (exclude the sender account.).
    //TODO: move this to client side for more performance.
    const clients = io.sockets.adapter.rooms[req.user.uniqueID].sockets;  
    for (var clientId in clients ) {
      if (clientId !== socketID) {
        const clientSocket = io.sockets.connected[clientId];
        clientSocket.emit('receiveMessage', {message: messageCreated, tempID});
      } 
    }

    // TODO: for group messaging, do a loop instead of [0]
    io.in(channel.recipients[0].uniqueID).emit('receiveMessage', {message: messageCreated});

    //change lastMessage timeStamp
    const updateChannelTimeStap = Channels.updateMany(
      {channelID},
      { $set: { lastMessaged: Date.now()}},
      { upsert: true})

      // sends notification to a user.
      const sendNotificaiton = Notifications.findOneAndUpdate({
        recipient : channel.recipients[0].uniqueID,
        channelID
      }, { 
        $set :{
          recipient : channel.recipients[0].uniqueID,
          channelID,
          type: "MESSAGE_CREATED",
          lastMessageID: messageCreated.messageID,
          sender: req.user.id
        },
        $inc : { count : 1 }
      }, {
        upsert : true
      });
      await Promise.all([updateChannelTimeStap, sendNotificaiton]);
  }
}