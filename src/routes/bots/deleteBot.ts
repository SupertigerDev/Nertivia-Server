import { Request, Response } from "express";
import User from '../../models/users';

export default async function deleteBot(req: Request, res: Response) {
  const { bot_id } = req.params;
  try {
    const bot: any = await User.exists({uniqueID: bot_id, bot: true, createdBy: req.user._id});
    if(!bot) return res.status(404).json({ message: "Bot not found." });

    bot.username = "DeletedBot"+(Math.floor(Math.random() * 100000) + 1);
    bot.createdBy = "deleted";

    let error = false
    await User.updateOne({ _id: bot._id }, bot).catch(() => { error = true });
    if (error) {
      res.status(403).json({message: "Something went wrong while storing to database."})
      return;
    }

    //await User.deleteOne({uniqueID: bot_id, bot: true, createdBy: req.user._id});
    res.json({message: "success"});
  } catch(err) {
    res.json({message: err});
  }
}