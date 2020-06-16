const matchAll = require("match-all");
const Messages = require("../../models/messages");
const Users = require("../../models/users");
const { matchedData } = require('express-validator');

module.exports = async (req, res, next) => {
  const { channelID, messageID } = req.params;
  const message = await Messages.findOne({ channelID, messageID });
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;
  if (!message)
    return res.status(404).json({ message: "Message was not found." });
  if (message.creator.toString() !== user._id)
    return res.status(403).json({ message: "Message is not created by you." });

  // filtered data
  let data = matchedData(req);


  let _color;
  if (typeof data.color === 'string' && data.color.startsWith('#')) {
    _color = data.color.substring(0, 7);
  }

  if (data.color && data.color === -1) {
    _color = undefined
  }
  
  if (data.message && data.message.length > 5000) {
    return res.status(403).json({
      status: false,
      message: "Message must contain characters less than 5,000"
    });
  }

  data.color = _color;

  // converted to a Set to remove duplicates.
  let mentionIds = Array.from(new Set(matchAll(data.message, /<@([\d]+)>/g).toArray()));

  const mentions = mentionIds.length ? await Users.find({uniqueID: {$in: mentionIds}}).select('_id uniqueID avatar tag username').lean() : [];

  const _idMentionsArr = mentions.map(m => m._id )
  

  
  let resObj = { ...data, timeEdited: Date.now(), messageID, channelID };
  let query = {$unset: { embed: "" }}
  if (!data.color) {
    query['$unset'].color = 0;
  }

  
  try {
    await Messages.updateOne(
      { messageID },
      { ...resObj, mentions: _idMentionsArr, query }
    );
    resObj.color = data.color || -2;
    resObj.creator = {
      uniqueID: req.user.uniqueID,
      username: req.user.username,
      tag: req.user.tag,
      avatar: req.user.avatar,
      admin: req.user.admin
    };
    res.json({ ...resObj,mentions, embed: 0 });
    const io = req.io;
    if (server) {
      io.in("server:" + server.server_id).emit("update_message", {
        ...resObj,
        mentions,
        embed: 0
      });
    } else {
      io.in(user.uniqueID).emit("update_message", { ...resObj, embed: {} });
      io.in(channel.recipients[0].uniqueID).emit("update_message", {
        ...resObj,
        mentions,
        embed: 0
      });
    }
    req.message_status = true;
    req.message_id = messageID;
    next();
  } catch (error) {
    console.log(error);
    return res
      .status(403)
      .json({ message: "Something went wrong. Try again later." });
  }
};
