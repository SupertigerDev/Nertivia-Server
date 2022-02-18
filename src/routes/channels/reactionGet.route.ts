import { Request, Response, Router } from 'express';
import { FilterQuery } from 'mongoose';
import { authenticate } from '../../middlewares/authenticate';
import { channelVerification } from '../../middlewares/ChannelVerification';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import rateLimit from '../../middlewares/rateLimit';
import {MessageReaction, MessageReactions} from '../../models/MessageReactions';


export const reactionGet = (Router: Router) => {
  Router.route("/:channelId/messages/:messageId/reactions").get(
    authenticate({allowBot: true}),
    rateLimit({name: 'message_react_users', expire: 60, requestsLimit: 120 }),
    channelVerification,
    disAllowBlockedUser,
    route
  );  
} 



async function route (req: Request, res: Response){
  const {channelId, messageId} = req.params;

  const {emojiID, unicode} = req.query;
  
  let limit = parseInt(req.query.limit as string || "100");
  let skip = parseInt(req.query.skip as string || "0");

  if (limit < 1 || limit > 100) {
    limit = 100;
  }

  let filter: FilterQuery<MessageReaction> = { messageID: messageId };
  if (emojiID) {
    filter.emojiID = emojiID as string
  } else {
    filter.unicode = unicode as string
  }

  const reaction = await MessageReactions.findOne(filter, {reactedBy:{$slice:[skip, limit]}}).populate("reactedBy", "username tag id avatar")
  if (!reaction) {
    return res.status(404).json({ message: "Reaction not found" });
  }
  res.json(reaction.reactedBy);
  

}