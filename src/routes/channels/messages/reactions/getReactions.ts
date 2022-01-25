import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import {MessageReaction, MessageReactions} from '../../../../models/MessageReactions';

export async function getReactions(req: Request, res: Response) {
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