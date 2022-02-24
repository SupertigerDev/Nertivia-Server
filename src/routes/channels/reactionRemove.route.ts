import { Request, Response, Router } from 'express';
import { FilterQuery } from 'mongoose';
import { authenticate } from '../../middlewares/authenticate';
import { channelVerify } from '../../middlewares/channelVerify.middleware';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import {rateLimit} from '../../middlewares/rateLimit.middleware';
import {MessageReaction, MessageReactions} from '../../models/MessageReactions';
import {Messages} from '../../models/Messages'
import { MESSAGE_REACTION_UPDATED } from '../../ServerEventNames';



export const reactionRemove = (Router: Router) => {
  Router.route("/:channelId/messages/:messageId/reactions").delete(
    authenticate({allowBot: true}),
    rateLimit({name: 'message_react', expire: 60, requestsLimit: 120 }),
    channelVerify,
    disAllowBlockedUser,
    route
  );
} 



async function route (req: Request, res: Response){
  const { channelId, messageId } = req.params;
  const { emojiID, unicode } = req.body;


  const message = await Messages.findOne({ channelId: channelId, messageID: messageId });
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
    channelId: channelId,
    messageID: messageId,
    unReactedByUserID: req.user.id,
    reaction: {
      emojiID: reaction.emojiID,
      unicode: reaction.unicode,
      gif: reaction.gif,
      count: count - 1,
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