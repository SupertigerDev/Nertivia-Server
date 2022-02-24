import {Request, Response, NextFunction} from 'express';
import { zip } from '../../utils/zip'
import {jsonToHtml} from 'jsonhtmlfyer';
import SocketIO from 'socket.io'
import {ServerMembers} from "../../models/ServerMembers";
import {Message, Messages} from '../../models/Messages'

import {MessageQuotes} from '../../models/MessageQuotes'
const matchAll = require("match-all");
import { Users } from "../../models/Users";
import {Channels} from "../../models/Channels";

const sendMessageNotification = require('../../utils/SendMessageNotification');

import {sendDMPush, sendServerPush} from '../../utils/sendPushNotification'
import { MESSAGE_CREATED, MESSAGE_UPDATED } from '../../ServerEventNames';

export default async (req: Request, res: Response, next: NextFunction) => {
  const { channelId, messageID } = req.params;
  let { tempID, socketID, color, buttons, htmlEmbed } = req.body;
  let message = req.body.message;


  // If messageID exists, message wants to update.
  let messageDoc: Message | null = null;
  if (messageID) {
    messageDoc = await Messages.findOne({ channelId, messageID });
    if (!messageDoc)
      return res.status(404).json({ message: "Message was not found." });
    if (messageDoc.creator.toString() !== req.user._id)
      return res.status(403).json({ message: "Message is not created by you." });
  }

  if (req.uploadFile) {
    message = req.uploadFile.message;
  }

if ((!message || !message.trim()) && (!req.uploadFile && !htmlEmbed)) {
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
    } catch(err: any) {
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
  let mentionIds: string[] = Array.from(new Set(matchAll(message, /<@([\d]+)>/g).toArray()));

  //\[@:([\d]+)]
  // newMentionIDs
  mentionIds = Array.from(new Set([...mentionIds, ...matchAll(message, /\[@:([\d]+)]/g).toArray()]))

  let mentions: any[] = [];
  if (mentionIds.length) {
    mentions = await Users.find({id: {$in: mentionIds}}).select('_id id avatar tag username').lean();
  } 
  const _idMentionsArr = mentions.map((m:any)=> m._id )
  
  // converted to a Set to remove duplicates.
  const messageIds: string[] = Array.from(new Set(matchAll(message, /<m([\d]+)>/g).toArray()));

  let quotedMessages: Partial<Message>[] = [];
  let quoteObjectIds = []
  if (messageIds.length) {
    if (messageDoc && messageIds.includes(messageDoc.messageID)) {
      res.status(403).json({message: "Cannot quote this message."})
      return;
    }

    quotedMessages = await Messages.find({channelId, messageID: {$in: messageIds}}, {_id: 0})
      .select('creator message messageID quotes')
      .populate([
        {
          path: "quotes",
          select: "creator message messageID",
          populate: {
            path: "creator",
            select: "avatar username id tag admin -_id",
            model: "users"
          }
        },
        {
          path: "creator",
          select: "username id avatar"
        }
      ]).lean()




    
    const quoteInsertPayload = quotedMessages.map(q => {
      return {...q, creator: q.creator._id, quotedChannel: req.channel._id}
    })


    quoteObjectIds = (await MessageQuotes.insertMany(quoteInsertPayload)).map((qm)=> qm._id)

    for (let index = 0; index < quotedMessages.length; index++) {
      const quotedMessage = quotedMessages[index] as Message;
      if (!quotedMessage.quotes) continue
      
      const nestedArr= filterNestedQuotes (quotedMessage?.message, quotedMessage.quotes);
      quoteObjectIds = [...quoteObjectIds, ...nestedArr.map((q: any) => q._id)]
      quotedMessages = [...quotedMessages, ...nestedArr];
      if (!quotedMessages[index].quotes) continue;
      delete quotedMessages[index].quotes;

    }

  }


  let query: any = {
    channelId,
    message,
    creator: req.user._id,
    messageID: "placeholder",
    mentions: _idMentionsArr,
    quotes: quoteObjectIds
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
    query.created = messageDoc?.created
    query.timeEdited = Date.now()
    if (!req.uploadFile && messageDoc?.files) {
      query.files = messageDoc?.files;
    }
    await Messages.replaceOne({messageID}, query);
  } else {
    const messageCreate = new Messages(query)
    messageCreated = await messageCreate.save();
  }

  const user = {
    id: req.user.id,
    username: req.user.username,
    tag: req.user.tag,
    avatar: req.user.avatar,
    badges: req.user.badges,
    bot: req.user.bot,
  };

  messageCreated = {
    channelId,
    message,
    color: _color,
    creator: user,
    created: messageCreated ? messageCreated.created : messageDoc?.created,
    mentions,
    quotes: quotedMessages,
    messageID: messageCreated ? messageCreated.messageID : messageID
  };
  if (query.timeEdited) {
    messageCreated.timeEdited = query.timeEdited
  }
  if (req.uploadFile && req.uploadFile.file) {
    messageCreated.files = [req.uploadFile.file]
  } else if (messageID && messageDoc?.files) {
    messageCreated.files = messageDoc?.files
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
    serverMessage(req, io, channelId, messageCreated, socketID);
  } else {
    directMessage(req, io, channelId, messageCreated, socketID, tempID);
  }
  next();
  

};

async function serverMessage(req: any, io: SocketIO.Server, channelId: any, messageCreated: any, socketID: any) {

  io.in("server:" + req.channel.server.server_id).allSockets().then(sockets => {
    sockets.forEach(socket_id => {
      if (socket_id === socketID) return;
      io.to(socket_id).emit(MESSAGE_CREATED, {
        message: messageCreated
      });
    })
  })

  

  const date = Date.now();
  await Channels.updateOne({ channelId }, { $set: {
    lastMessaged: date
  }})

  //send notification
  await sendMessageNotification({
    message: messageCreated,
    channelId,
    server_id: req.channel.server._id,
    sender: req.user,
  })

  await ServerMembers.updateOne({server: req.channel.server._id, member: req.user._id}, {
    $set: {
        [`last_seen_channels.${channelId}`] : date + 1
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

async function directMessage(req: any, io: SocketIO.Server, channelId: any, messageCreated: any, socketID: any, tempID: any) {

  const isSavedNotes = req.user.id === req.channel.recipients[0].id

  // checks if its sending to saved notes or not.
  if (!isSavedNotes) {
    //change lastMessage timeStamp
    const updateChannelTimeStamp = Channels.updateMany(
      {
        channelId
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
      recipientUserID: req.channel.recipients[0].id,
      channelId,
      sender: req.user,
    })
    await Promise.all([updateChannelTimeStamp, sendNotification]);
  }




  if (!isSavedNotes){
    // for group messaging, do a loop instead of [0]
    io.in(req.channel.recipients[0].id).emit(MESSAGE_CREATED, {
      message: messageCreated
    });
  }

  // Loop for other users logged in to the same account and emit (exclude the sender account.).
  io.in(req.user.id).allSockets().then(sockets => {
    sockets.forEach(socket_id => {
      if (socket_id === socketID) return;
      io.to(socket_id).emit(MESSAGE_CREATED, {
        message: messageCreated,
        tempID,
      });
    })
  })




  if (isSavedNotes) return;

    sendDMPush({
      sender: req.user,
      message: messageCreated,
      recipient: req.channel.recipients[0],
    })  

}

function updateMessage(req: any,server: any, resObj: any, io: any) {
  if (server) {
    io.in("server:" + server.server_id).emit(MESSAGE_UPDATED, {
      ...resObj,
      embed: 0
    });
  } else {
    io.in(req.user.id).emit(MESSAGE_UPDATED, { ...resObj, embed: {} });
    io.in(req.channel.recipients[0].id).emit(MESSAGE_UPDATED, {
      ...resObj,
      embed: 0
    });
  }
}
