import { Request, Response } from "express";
import Users from '../../models/users';
const redis = require("../../redis");
import socketio from 'socket.io'
import JWT from 'jsonwebtoken'
import config from "../../config";

export default async function resetBotToken(req: Request, res: Response) {
  const { bot_id } = req.params;

  const bot: any = await Users.findOne({createdBy: req.user._id, uniqueID: bot_id}).select("passwordVersion").lean();
  if (!bot) {
    res.status(403).json({message: "Could not find bot."})
    return;
  }

  await Users.updateOne({_id: bot._id}, {$inc: { passwordVersion: 1 }});

  res.json({token: JWT.sign(`${bot_id}-${bot.passwordVersion ? bot.passwordVersion : 1 }`, config.jwtSecret).split(".").splice(1).join(".")})

  kickBot(req.io, bot_id);
}



async function kickBot(io: socketio.Server, uniqueID: string) {
  await redis.deleteSession(uniqueID);
  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (!rooms || !rooms.sockets) return;

  for (const clientId in rooms.sockets) {
    const client = io.sockets.connected[clientId];
    if (!client) continue;
    client.emit("auth_err", "Token outdated.");
    client.disconnect(true);
  }
}
