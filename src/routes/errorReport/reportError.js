const Messages = require("../../models/messages");
const Users = require("../../models/users");
const Channels = require("../../models/channels");

// create a bot in nertivia, create a server and copy the channel iDID
const bot_id = "6768469612037148672"
const channel_id = "6768469298621976576"
const server_id = "6768469298621976577"

module.exports = async (req, res, next) => {
  const { message, name, stack, user_message, url } = req.body;

  const bot = await Users.findOne({uniqueID: bot_id});
  if (!bot) {
    res.status(403).json({message: "Bot could not be found."});
    return;
  }

  const message_string = `**Name**: ${name}\n**Message:** ${message}\n**User Message:** ${user_message}\n**URL:** ${url}\n\n**Stack:**` +  "```+ " +stack+ "```"

  const messageCreated = await Messages.create({
    channel_id,
    message: message_string,
    creator: bot._id,
    channelID: channel_id,
    messageID: "placeholder",
  })
  await Channels.updateOne({ channelID: channel_id }, { $set: {
    lastMessaged: Date.now()
  }})

res.json({message: "Done!"});

  const io = req.io;

  io.to("server:" + server_id).emit("receiveMessage", {
    message: messageCreated
  })

  //send notification
  await sendMessageNotification({
    message: messageCreated,
    channelID: channel_id,
    server_id: server_id,
    sender: bot,
  })
};