import { Request, Response } from "express";
import { Users } from "../../models/Users";

export default async function createBot(req: Request, res: Response) {
  const botUsername = `${req.user.username}'s Bot`;

  //await Users.deleteMany({createdBy: req.user._id});

  const botCount = await Users.countDocuments({createdBy: req.user._id});
  if (botCount >= 5) {
    res.status(403).json({message: "You can only create 5 bots."})
    return;
  }


  const newBot = await Users.create({ username: botUsername, bot: true, createdBy: req.user._id, ip: req.userIP })
  res.send(newBot)
}