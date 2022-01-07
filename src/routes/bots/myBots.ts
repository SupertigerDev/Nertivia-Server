import { Request, Response } from "express";
import { Users } from "../../models/Users";

export default async function createBot(req: Request, res: Response) {
  
  const bots = await Users.find({createdBy: req.user._id}, {_id: 0}).select("avatar bot created tag id username").lean();

  res.json(bots);

}