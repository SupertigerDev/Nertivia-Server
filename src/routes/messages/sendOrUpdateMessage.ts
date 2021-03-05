import {Request, Response, NextFunction} from 'express';
import { zip, unzip } from '../../utils/zip'
import {jsonToHtml} from 'jsonhtmlfyer';
const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const MessageQuotes = require("../../models/messageQuotes");
const matchAll = require("match-all");
const Users = require("../../models/users");
const Channels = require("../../models/channels");
const Devices = require("../../models/Devices");

const sendMessageNotification = require('./../../utils/SendMessageNotification');

import {sendDMPush, sendServerPush} from '../../utils/sendPushNotification'
import config from '../../config';
import { json } from 'body-parser';
import channels from '../../models/channels';

export default async (req: Request, res: Response, next: NextFunction) => {
  const { channelID, messageID } = req.params;
  let { tempID, socketID, color, buttons, htmlEmbed } = req.body;
  let message = undefined;
  if (req.body.message) {
    message = req.body.message.replace(
      /[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F\u{2000}-\u{200F}\u{202F}\u{2800}\u{17B5}\u{17B5}\u{17B5}\u{17B5}\u{17B5}\u{17B5}]/gu,
      ""
    );
  } 

  // If messageID exists, message wants to update.
  let messageDoc;
  if (messageID) {
    messageDoc = await Messages.findOne({ channelID, messageID });
    if (!messageDoc)
      return res.status(404).json({ message: "Message was not found." });
    if (messageDoc.creator.toString() !== req.user._id)
      return res.status(403).json({ message: "Message is not created by you." });
  }

  if (req.uploadFile) {
    message = req.uploadFile.message;
  }

  if ((!message || !message.trim()) && !req.uploadFile) {
    res.status(403).send({message: "Cant send empty message."})
    return;
  }

  let _color;
  if (typeof color === 'string' && color.startsWith('#')) {
    _color = color.substring(0, 7);
  }

  if (buttons && buttons.length) {

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
     if (button.name.trim().length > 40) {
      res.status(403).send({message: "Button name must be less than 40 characters."})  
      return;
     } 
     if (button.id.length >= 40) {
      res.status(403).send({message: "button id must be less than 40 characters."})  
      return;
     } 
      newButtons.push({name: button.name.trim(), id: button.id});
    }
    buttons = newButtons;
  }

  let jsonToBase64HtmlEmbed: string | undefined = undefined;
  if (htmlEmbed) {
    if (typeof htmlEmbed !== "object") {
      return res.status(403).send({message: "invalid htmlEmbed type."}) 
    }
    if (JSON.stringify(htmlEmbed).length > 5000) {
      return res.status(403).send({message: "Json length must be less than 5000"});
    }
    try {
      //use jsonToHtml to validate the json first before implimenting the new markdown!!!!!!
      jsonToHtml(htmlEmbed)
      jsonToBase64HtmlEmbed = zip(JSON.stringify(htmlEmbed));
    } catch(err) {
      return res.status(403).send({message: err.message});
    }
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
    if (messageDoc && messageIds.includes(messageDoc.messageID)) {
      res.status(403).json({message: "Cannot quote this message."})
      return;
    }
    quotedMessages = await Messages.find({channelID, messageID: {$in: messageIds}}, {_id: 0})
      .select('creator message messageID quotes')
      .populate([
        {
          path: "quotes",
          select: "creator message messageID",
          populate: {
            path: "creator",
            select: "avatar username uniqueID tag admin -_id",
            model: "users"
          }
        },
        {
          path: "creator",
          select: "username uniqueID avatar"
        }
      ]).lean()
    quotes_idArr = (await MessageQuotes.insertMany(quotedMessages.map((q: any) => {
      return {...q, creator: q.creator._id, quotedChannel: req.channel._id}
    }))).map((qm: any)=> qm._id)

    for (let index = 0; index < quotedMessages.length; index++) {
      const quotedMessage = quotedMessages[index];
      if (!quotedMessage.quotes) continue
      
      const nestedArr= filterNestedQuotes (quotedMessage.message, quotedMessage.quotes);
      quotes_idArr = [...quotes_idArr, ...nestedArr.map((q: any) => q._id)]
      quotedMessages = [...quotedMessages, ...nestedArr];
      delete quotedMessages[index].quotes;

    }

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
  if (buttons && buttons.length) {
    query.buttons = buttons;
  }
  if (jsonToBase64HtmlEmbed) {
    query.htmlEmbed = jsonToBase64HtmlEmbed;
  }
  if (_color) query['color'] = _color;

  let messageCreated: any = undefined;
  if (messageID) {
    query.messageID = messageID
    query.created = messageDoc.created
    query.timeEdited = Date.now()
    if (!req.uploadFile && messageDoc.files) {
      query.files = messageDoc.files;
    }
    await Messages.replaceOne({messageID}, query);
  } else {
    const messageCreate = new Messages(query)
    messageCreated = await messageCreate.save();
  }

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
    created: messageCreated ? messageCreated.created : messageDoc.created,
    mentions,
    quotes: quotedMessages,
    messageID: messageCreated ? messageCreated.messageID : messageID
  };
  if (query.timeEdited) {
    messageCreated.timeEdited = query.timeEdited
  }
  if (req.uploadFile && req.uploadFile.file) {
    messageCreated.files = [req.uploadFile.file]
  } else if (messageID && messageDoc.files) {
    messageCreated.files = messageDoc.files
  }
  if (buttons && buttons.length) {
    messageCreated.buttons = buttons;
  }
  if (jsonToBase64HtmlEmbed) {
    messageCreated.htmlEmbed = jsonToBase64HtmlEmbed;
  }

  if (messageID) {
    res.json(messageCreated);
  } else {
    res.json({
      status: true,
      tempID,
      messageCreated
    });
  }

  //req.message_status = true;
  req.message_id = messageCreated.messageID;

  // emit
  const io: SocketIO.Server = req.io;

  if (messageID) {
    updateMessage(req, req.channel.server, messageCreated, io);
  } else if (req.channel.server) {
    serverMessage(req, io, channelID, messageCreated, socketID);
  } else {
    directMessage(req, io, channelID, messageCreated, socketID, tempID);
  }
  next();
  

};

async function serverMessage(req: any, io: any, channelID: any, messageCreated: any, socketID: any) {


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

  const date = Date.now();
  await channels.updateOne({ channelID }, { $set: {
    lastMessaged: date
  }})

  //send notification
  await sendMessageNotification({
    message: messageCreated,
    channelID,
    server_id: req.channel.server._id,
    sender: req.user,
  })

  await ServerMembers.updateOne({server: req.channel.server._id, member: req.user._id}, {
    $set: {
        [`last_seen_channels.${channelID}`] : date + 1
    }
  })


  sendServerPush({
    sender: req.user,
    message: messageCreated,
    channel: req.channel,
    server_id: req.channel.server.server_id
  })  

}

function filterNestedQuotes(baseQuote: string, quotes: any[]) {
  const reg = /<m([\d]+)>/g;
  const quotesIDArr: string[] = matchAll(baseQuote, reg).toArray();
  return quotes.filter(q => quotesIDArr.includes(q.messageID))
}

async function directMessage(req: any, io: any, channelID: any, messageCreated: any, socketID: any, tempID: any) {

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


  if (isSavedNotes) return;

    sendDMPush({
      sender: req.user,
      message: messageCreated,
      recipient: req.channel.recipients[0],
    })  

}

function updateMessage(req: any,server: any, resObj: any, io: any) {
  if (server) {
    io.in("server:" + server.server_id).emit("update_message", {
      ...resObj,
      embed: 0
    });
  } else {
    io.in(req.user.uniqueID).emit("update_message", { ...resObj, embed: {} });
    io.in(req.channel.recipients[0].uniqueID).emit("update_message", {
      ...resObj,
      embed: 0
    });
  }
}
