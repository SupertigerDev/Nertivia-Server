import {MessageReactions} from '../../models/MessageReactions';
import {Messages} from '../../models/Messages'
import { MESSAGE_REACTION_UPDATED } from '../../ServerEventNames';


module.exports = async (req, res, next) => {
  const { channelId, messageID } = req.params;
  const { emojiID, gif, unicode } = req.body;

  const message = await Messages.findOne({ channelId, messageID });
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

  // check if reaction exists
  const reactionExists = await MessageReactions.exists({...filter});
  if (!reactionExists) {
    const count = await MessageReactions.countDocuments({messageID});
    if (count > 10) {
      return res.status(403).json({ message: "Maximum reaction limit reached!" });
  
    }
  }


  // check if already reacted
  const alreadyReacted = await MessageReactions.exists({...filter, reactedBy: req.user._id});
  if (alreadyReacted) {
    return res.status(403).json({ message: "Already reacted." });

  }

  await MessageReactions.updateOne(filter, {
    $addToSet: {
      reactedBy: req.user._id
    },
    $set: {
      gif: gif === true
    }
  }, {upsert: true})

  const doc = await MessageReactions.findOne({...filter, reactedBy: req.user._id});
  
  const response = {
    channelId,
    messageID,
    reactedByUserID: req.user.id,
    reaction: {
      emojiID: doc.emojiID,
      unicode: doc.unicode,
      gif: doc.gif,
      count: doc.reactedBy.length,
    }
  }
  
  if (req.channel.server) {
    req.io.in("server:" + req.channel.server.server_id).emit(MESSAGE_REACTION_UPDATED, response)
  } else {
    req.io.in(req.user.id).emit(MESSAGE_REACTION_UPDATED, response);
    req.io.in(req.channel.recipients[0].id).emit(MESSAGE_REACTION_UPDATED, response);
  }

  res.json(response);



}