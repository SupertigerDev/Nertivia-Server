import {MessageReactions} from '../../models/MessageReactions';

module.exports = async (req, res, next) => {
  const {channelId, messageID} = req.params;

  const {emojiID, unicode} = req.query;
  
  let limit = parseInt(req.query.limit || "100");
  let skip = parseInt(req.query.skip || "0");

  if (limit < 1 || limit > 100) {
    limit = 100;
  }

  let filter = {messageID};
  if (emojiID) {
    filter.emojiID = emojiID
  } else {
    filter.unicode = unicode
  }

  const reaction = await MessageReactions.findOne(filter, {reactedBy:{$slice:[skip, limit]}}).populate("reactedBy", "username tag id avatar")
  if (!reaction) {
    return res.status(404).json({ message: "Reaction not found" });
  }
  res.json(reaction.reactedBy);
  

}