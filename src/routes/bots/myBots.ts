import { Request, Response } from "express";
const Users = require('../../models/users')

export default async function createBot(req: Request, res: Response) {
  
  const bots = await Users.find({createdBy: req.user._id}, {_id: 0}).select("avatar bot created tag uniqueID username").lean();

  res.json(bots);

}