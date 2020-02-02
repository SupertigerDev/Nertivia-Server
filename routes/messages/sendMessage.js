const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Users = require("../../models/users");
const Channels = require("../../models/channels");
const Notifications = require("./../../models/notifications");
const Devices = require("../../models/Devices");
const FCM = require("fcm-node");
const config = require('./../../config');

const sendMessageNotification = require('./../../utils/SendMessageNotification');

const serverKey = require("./../../fb-fcm.json");
const fcm = new FCM(serverKey);

module.exports = async (req, res, next) => {
  const { channelID } = req.params;
  const { tempID, message, socketID, color } = req.body;
  let _color;
  if (typeof color === 'string' && color.startsWith('#')) {
    _color = color.substring(0, 7);
  }

  if (!message || message.trim() === "") return next();

  if (message.length > 5000) {
    return res.status(403).json({
      status: false,
      message: "Message must contain characters less than 5,000"
    });
  }

  let query = {
    channelID,
    message,
    creator: req.user._id,
    messageID: "placeholder"
  }
  if (_color) query['color'] = _color;

  const messageCreate = new Messages(query)

  let messageCreated = await messageCreate.save();

  const user = {
    uniqueID: req.user.uniqueID,
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    admin: req.user.admin
  };
  messageCreated = {
    channelID,
    message,
    color: _color,
    creator: user,
    created: messageCreated.created,
    messageID: messageCreated.messageID
  };

  res.json({
    status: true,
    tempID,
    messageCreated
  });

  req.message_status = true;
  req.message_id = messageCreated.messageID;
  next();

  // emit
  const io = req.io;

  if (req.channel.server) {
    return serverMessage();
  } else {
    return directMessage();
  }

  async function serverMessage() {


    const clients =
      io.sockets.adapter.rooms["server:" + req.channel.server.server_id]
        .sockets;
    for (let clientId in clients) {
      if (clientId !== socketID) {
        io.to(clientId).emit("receiveMessage", {
          message: messageCreated
        });
      }
    }


    //send notification
    const uniqueIDs = await sendMessageNotification({
      message: messageCreated,
      channelID,
      server_id: req.channel.server._id,
      sender: req.user,
    })


    sendPushNotificationServer(req.user, messageCreated, uniqueIDs, req.channel.server)


    return;
  }

  async function directMessage() {

    const isSavedNotes = req.user.uniqueID === req.channel.recipients[0].uniqueID

    // checks if its sending to saved notes or not.
    if (!isSavedNotes) {
      //change lastMessage timeStamp
      const updateChannelTimeStamp = Channels.updateMany(
        {
          channelID
        },
        {
          $set: {
            lastMessaged: Date.now()
          }
        },
        {
          upsert: true
        }
      );

    // sends notification to a user.

      const sendNotification = sendMessageNotification({
        message: messageCreated,
        recipient_uniqueID: req.channel.recipients[0].uniqueID,
        channelID,
        sender: req.user,
      })
      await Promise.all([updateChannelTimeStamp, sendNotification]);
    }




    if (!isSavedNotes){
      // for group messaging, do a loop instead of [0]
      io.in(req.channel.recipients[0].uniqueID).emit("receiveMessage", {
        message: messageCreated
      });
    }

    // Loop for other users logged in to the same account and emit (exclude the sender account.).
    //TODO: move this to client side for more performance.
    const rooms = io.sockets.adapter.rooms[req.user.uniqueID];
    if (rooms)
      for (let clientId in rooms.sockets || []) {
        if (clientId !== socketID) {
          io.to(clientId).emit("receiveMessage", {
            message: messageCreated,
            tempID
          });
        }
      }


    if (!isSavedNotes)
      sendPushNotification(req.user, messageCreated, req.channel.recipients[0]);
  }
};

async function sendPushNotificationServer(user, msg, uniqueIDs, server) {
  // check if notification token exists
  const requestToken = await Devices.find({ user_id: {$in: uniqueIDs}});

  if (!requestToken || !requestToken.length) return;

  const tokens = requestToken.map(t => t.token);

  const msgContent = msg.message;

  const message = {
    //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    registration_ids: tokens,
 
    data: {
      username: user.username,
      channel_id: msg.channelID,
      unique_id: user.uniqueID,
      server_id: server.server_id,
      server_name: server.name,
      avatar: server.avatar,
      message: msgContent.length >= 500
      ? msgContent.substring(0, 500) + "..."
      : msgContent,
    }
  };

  fcm.send(message, async function(err, response) {
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      // remove all expired tokens from db.
      const failedTokens = response.results
        .map((r, i) => r.error && tokens[i])
        .filter(r => r);
      await Devices.deleteMany({ token: { $in: failedTokens } });
    }
  });
}

async function sendPushNotification(user, msg, recipient) {
  const _id = recipient._id;

  // check if notification token exists
  const requestToken = await Devices.find({ user: _id });

  if (!requestToken || !requestToken.length) return;

  const tokens = requestToken.map(t => t.token);

  const msgContent = msg.message;

  const message = {
    //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    registration_ids: tokens,
 
    data: {
      username: user.username,
      channel_id: msg.channelID,
      unique_id: user.uniqueID,
      avatar: user.avatar,
      message: msgContent.length >= 500
      ? msgContent.substring(0, 500) + "..."
      : msgContent,
    }
  };

  fcm.send(message, async function(err, response) {
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      // remove all expired tokens from db.
      const failedTokens = response.results
        .map((r, i) => r.error && tokens[i])
        .filter(r => r);
      await Devices.deleteMany({ token: { $in: failedTokens } });
    }
  });
}
