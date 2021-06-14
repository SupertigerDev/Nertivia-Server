const MessageReactions = require("../../models/MessageReactions");
const Messages = require("../../models/messages");

module.exports = async (req, res, next) => {
  const { channelID, messageID } = req.params;
  const { emojiID, unicode } = req.body;


  const message = await Messages.findOne({ channelID, messageID });
  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }
  if (!emojiID && !unicode) {
    return res.status(403).json({ message: "Missing emojiID or unicode." });
  }

  let filter = {messageID};
  if (emojiID) {
    filter.emojiID = emojiID
  } else {
    filter.unicode = unicode
  }

  const reaction = await MessageReactions.findOne(filter);
  if (!reaction) {
    return res.status(403).json({ message: "Reaction not found" });
  }


  // check if already reacted
  const didReact = reaction.reactedBy.find(_id => _id.toString() === req.user._id.toString())
  if (!didReact) {
    return res.status(403).json({ message: "You did not react." });
  }
  const count = reaction.reactedBy.length;

  if (count === 1) {
    await MessageReactions.deleteOne(filter)
  } else {
    await MessageReactions.updateOne(filter, {$pull: {reactedBy: req.user._id}})
  }

  
  const response = {
    channelID,
    messageID,
    unReactedByUserID: req.user.id,
    reaction: {
      emojiID: reaction.emojiID,
      unicode: reaction.unicode,
      gif: reaction.gif,
      count: count - 1,
    }
  }

  
  if (req.channel.server) {
    req.io.in("server:" + req.channel.server.server_id).emit("message:update_reaction", response)
  } else {
    req.io.in(req.user.id).emit("message:update_reaction", response);
    req.io.in(req.channel.recipients[0].id).emit("message:update_reaction", response);
  }

  res.json(response);
  

}