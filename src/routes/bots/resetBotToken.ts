import { Request, Response } from "express";
import Users from '../../models/users';
const redis = require("../../redis");
import socketio from 'socket.io'
import JWT from 'jsonwebtoken'

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



async function kickBot(io: any, bot_id: string) {
  await redis.deleteSession(bot_id);

  io.in(bot_id).clients((err: any, clients: any[]) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.to(id).emit("auth_err", "Token outdated.");
      io.of('/').adapter.remoteDisconnect(id, true) 
    }
  });
}
