import { Request, Response, Router } from 'express';
import { FilterQuery } from 'mongoose';
import { authenticate } from '../../middlewares/authenticate';
import { channelVerification } from '../../middlewares/ChannelVerification';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import rateLimit from '../../middlewares/rateLimit';
import {MessageReaction, MessageReactions} from '../../models/MessageReactions';
import {Messages} from '../../models/Messages'
import { MESSAGE_REACTION_UPDATED } from '../../ServerEventNames';



export const reactionAdd = (Router: Router) => {
  Router.route("/:channelId/messages/:messageId/reactions").post(
    authenticate(true),
    rateLimit({name: 'message_react', expire: 60, requestsLimit: 120 }),
    channelVerification,
    disAllowBlockedUser,
    route
  );
} 



async function route (req: Request, res: Response) {
  const { channelId, messageId } = req.params;
  const { emojiID, gif, unicode } = req.body;

  const message = await Messages.findOne({ channelID: channelId, messageID: messageId });
  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }

  
  if (!emojiID && !unicode) {
    return res.status(403).json({ message: "Missing emojiID or unicode." });
  }

  let filter: FilterQuery<MessageReaction> = {messageID: messageId};
  if (emojiID) {
    filter.emojiID = emojiID
  } else {
    filter.unicode = unicode
  }

  // check if reaction exists
  const reactionExists = await MessageReactions.exists({...filter});
  if (!reactionExists) {
    const count = await MessageReactions.countDocuments({messageID: messageId});
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
  if (!doc) {
    return res.status(403).json({ message: "Something went wrong. (addReaction.ts)" });
  }
  
  const response = {
    channelID: channelId,
    messageID: messageId,
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