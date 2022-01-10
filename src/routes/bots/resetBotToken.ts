import { Request, Response } from "express";
import {Users} from '../../models/Users';
const redis = require("../../redis");
import SocketIO from 'socket.io'
import JWT from 'jsonwebtoken'
import { deleteSession } from "../../newRedisWrapper";
import { AUTHENTICATION_ERROR } from "../../ServerEventNames";

export default async function resetBotToken(req: Request, res: Response) {
  const { bot_id } = req.params;

  const bot: any = await Users.findOne({createdBy: req.user._id, id: bot_id}).select("passwordVersion").lean();
  if (!bot) {
    res.status(403).json({message: "Could not find bot."})
    return;
  }

  await Users.updateOne({_id: bot._id}, {$inc: { passwordVersion: 1 }});

  res.json({token: JWT.sign(`${bot_id}-${bot.passwordVersion ? bot.passwordVersion + 1 : 1 }`, process.env.JWT_SECRET).split(".").splice(1).join(".")})

  kickBot(req.io, bot_id);
}



async function kickBot(io: SocketIO.Server, bot_id: string) {
  await deleteSession(bot_id);

  io.in(bot_id).emit(AUTHENTICATION_ERROR, "Token outdated.");
  io.in(bot_id).disconnectSockets(true);
}

