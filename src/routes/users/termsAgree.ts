import { Users } from "../../models/Users";
import * as UserCache from '../../cache/User.cache';
import { Request, Response } from "express";

export async function termsAgree(req: Request, res: Response) {
  await UserCache.removeUser(req.user.id);
  await Users.updateOne({id: req.user.id}, {$set: {readTerms: true}});
  res.json({success: true})
}