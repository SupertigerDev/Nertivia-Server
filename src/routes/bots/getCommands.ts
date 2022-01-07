import { Request, Response } from "express";
import {Users} from '../../models/Users';

export default async function updateBot(req: Request, res: Response) {
  const bot_ids = Object.values(req.query) as string[]
  if (!Array.isArray(bot_ids)) {
    res.status(403).send({message: "Invalid type"})
    return
  }
  if (bot_ids.length >= 100) {
    res.status(403).send({message: "Array length must be less than 100."})
    return;
  }

  const bot = await Users.find({id: {$in: bot_ids}}, {_id: 0}).select("id botCommands").lean();
  res.json(bot);

}
