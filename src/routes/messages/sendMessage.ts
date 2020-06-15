import {Request, Response, NextFunction} from 'express';
const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const MessageQuotes = require("../../models/messageQuotes");
const matchAll = require("match-all");
const Users = require("../../models/users");
const Channels = require("../../models/channels");
const Devices = require("../../models/Devices");

const sendMessageNotification = require('./../../utils/SendMessageNotification');

import pushNotification from '../../utils/sendPushNotification'
import config from '../../config';

export default async (req: Request, res: Response, next: NextFunction) => {
  const { channelID } = req.params;
  let { tempID, message, socketID, color, buttons } = req.body;

  if (req.uploadFile) {
    message = req.uploadFile.message;
  }
 // console.log(req.uploadFile)
  if ((!message || !message.trim()) && !req.uploadFile) {
    res.status(403).send({message: "Cant send empty message."})
    return;
  }

  let _color;
  if (typeof color === 'string' && color.startsWith('#')) {
    _color = color.substring(0, 7);
  }

  if (buttons && buttons.length && req.user.bot) {

    if (buttons.length > 15) {
      res.status(403).send({message: "You can only add up to 15 buttons."})
      return;
    }

    // filter out user data
    const newButtons = [];

    for (let index = 0; index < buttons.length; index++) {
      const button: {name: string, id: string} = buttons[index];
      if (button.id.match(/[^A-Za-z0-9-]+/)){
        res.status(403).send({message: "Button id can only contain alphanumeric characters and dashes."})
        return;
      }
      if (!button.id) {
        res.status(403).send({message: "Button must contain an id"})  
        return;
      }
      if (!button.name || !button.name.trim()) {
        res.status(403).send({message: "Button must contain a name"})  
        return;
      }
     if (button.name.trim().length >= 10) {
      res.status(403).send({message: "Button name must be less than 10 characters."})  
      return;
     } 
     if (button.id.length >= 20) {
      res.status(403).send({message: "button id must be less than 20 characters."})  
      return;
     } 
      newButtons.push({name: button.name.trim(), id: button.id});
    }
    buttons = newButtons;
  }


  if (message && message.length > 5000) {
    return res.status(403).json({
      status: false,
      message: "Message must contain characters less than 5,000"
    });
  }

  // converted to a Set to remove duplicates.
  const mentionIds = Array.from(new Set(matchAll(message, /<@([\d]+)>/g).toArray()));

  let mentions = [];
  if (mentionIds.length) {
    mentions = await Users.find({uniqueID: {$in: mentionIds}}).select('_id uniqueID avatar tag username').lean();
  } 
  const _idMentionsArr = mentions.map((m:any)=> m._id )
  
  // converted to a Set to remove duplicates.
  const messageIds = Array.from(new Set(matchAll(message, /<m([\d]+)>/g).toArray()));

  let quotedMessages = [];
  let quotes_idArr = []
  if (messageIds.length) {
    quotedMessages = await Messages.find({channelID, messageID: {$in: messageIds}}, {_id: 0}).select('creator message messageID').populate("creator", "username uniqueID avatar").lean();
    quotes_idArr = (await MessageQuotes.insertMany(quotedMessages.map((q: any) => {
      return {...q, creator: q.creator._id, quotedChannel: req.channel._id}
    }))).map((qm: any)=> qm._id)
  }
  




  let query: any = {
    channelID,
    message,
    creator: req.user._id,
    messageID: "placeholder",
    mentions: _idMentionsArr,
    quotes: quotes_idArr
  }
  if (req.uploadFile && req.uploadFile.file) {
    query.files = [req.uploadFile.file]
  }
  if (buttons && buttons.length && req.user.bot) {
    query.buttons = buttons;
  }
  if (_color) query['color'] = _color;

  const messageCreate = new Messages(query)

  let messageCreated = await messageCreate.save();

  const user = {
    uniqueID: req.user.uniqueID,
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    admin: req.user.admin,
    bot: req.user.bot,
  };

  messageCreated = {
    channelID,
    message,
    color: _color,
    creator: user,
    created: messageCreated.created,
    mentions,
    quotes: quotedMessages,
    messageID: messageCreated.messageID
  };
  if (req.uploadFile && req.uploadFile.file) {
    messageCreated.files = [req.uploadFile.file]
  }
  if (buttons && buttons.length && req.user.bot) {
    messageCreated.buttons = buttons;
  }
  res.json({
    status: true,
    tempID,
    messageCreated
  });

  //req.message_status = true;
  req.message_id = messageCreated.messageID;
  next();

  // emit
  const io: SocketIO.Server = req.io;

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


    pushNotification({
      channel: req.channel,
      isServer: true,
      message: messageCreated,
      uniqueIDArr: uniqueIDs,
      user: req.user
    })


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
      pushNotification({
        user: req.user,
        message: messageCreated,
        recipient: req.channel.recipients[0],
        isServer: false,
      })  

  }
};