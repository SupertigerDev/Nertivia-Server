import {Messages} from '../../models/Messages'
import { Users } from "../../models/Users";
import {Channels} from "../../models/Channels";
import { MESSAGE_CREATED } from '../../ServerEventNames';
const sendMessageNotification = require('../../utils/SendMessageNotification')
// create a bot in nertivia, create a server and copy the channel iDID
const bot_id = "6768469612037148672"
const channel_id = "6768469298621976576"
const server_id = "6768469298621976577"

module.exports = async (req, res, next) => {
  const { message, name, stack, user_message, url } = req.body;

  const bot = await Users.findOne({id: bot_id});
  if (!bot) {
    res.status(403).json({message: "Bot could not be found."});
    return;
  }

  const message_string = `**Name**: ${name}\n**Message:** ${message}\n**User Message:** ${user_message}\n**URL:** ${url}\n\n**Stack:**` +  "```+ " +stack+ "```"

  const messageCreated = await Messages.create({
    channel_id,
    message: message_string,
    creator: bot._id,
    channelId: channel_id,
    messageID: "placeholder",
  })
  await Channels.updateOne({ channelId: channel_id }, { $set: {
    lastMessaged: Date.now()
  }})

res.json({message: "Done!"});

  const io = req.io;

  io.to("server:" + server_id).emit(MESSAGE_CREATED, {
    message: messageCreated
  })

  //send notification
  await sendMessageNotification({
    message: messageCreated,
    channelId: channel_id,
    server_id: server_id,
    sender: bot,
  })
};