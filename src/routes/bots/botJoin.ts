import { Request, Response } from "express";
import { Users } from "../../models/Users";
import {Servers} from '../../models/Servers';
import { ServerRoles } from "../../models/ServerRoles";
import joinServer from "../../utils/joinServer";

import flake from '../../utils/genFlakeId'
import { SERVER_ROLE_CREATED } from "../../ServerEventNames";


export default async function createBot(req: Request, res: Response) {
  const { bot_id, server_id } = req.params;
  const permissions = parseInt(req.body.permissions) || 0;

  const bot: any = await Users.findOne({ id: bot_id, bot: true })
    .select("avatar tag id username admin _id")
    .lean();

  if (!bot) {
    res.status(404).json({ message: "Bot not found." })
    return;
  }

  //check if banned
  const isBanned = await Servers.exists({
    _id: req.server._id,
    "user_bans.user": bot._id
  });
  if (isBanned) {
    res.status(403).json({ message: "Bot is banned from the server." })
    return;
  }

  const joined = await Users.exists({
    _id: bot._id,
    servers: req.server._id as any
  });
  if (joined) {
    res.status(403).json({ message: "Bot is already in that server." })
    return;
  }



  // create role for bot
  const roleId = flake.gen();
  await ServerRoles.updateOne({server: req.server._id, default: true}, {$inc: {order: 2}})
  const doc = {
    name: bot.username,
    id: roleId,
    permissions: permissions,
    server: req.server._id,
    deletable: false,
    bot: bot._id,
    server_id: req.server.server_id,
    order: 0,
    hideRole: true
  };
  await ServerRoles.create(doc);

  const data = {
    name: doc.name,
    permissions: doc.permissions,
    deletable: false,
    botRole: true,
    hideRole: true,
    id: roleId,
    server_id: server_id,
    order: 0,
  };
  const io = req.io;
  io.in("server:" + req.server.server_id).emit(SERVER_ROLE_CREATED, data);
  
  
  // ready to perform join action

  joinServer(req.server, bot, undefined, req, res, roleId, "BOT");

}