import { Request, Response } from "express";
const Users = require('../../models/users')
import Servers from '../../models/servers';
import Roles from '../../models/Roles';
import joinServer from "../../utils/joinServer";

import flake from '../../utils/genFlakeId'


export default async function createBot(req: Request, res: Response) {
  const { bot_id, server_id } = req.params;
  const permissions = parseInt(req.body.permissions) || 0;

  const bot: any = await Users.findOne({ uniqueID: bot_id, bot: true })
    .select("avatar tag uniqueID username admin _id")
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
    servers: req.server._id
  });
  if (joined) {
    res.status(403).json({ message: "Bot is already in that server." })
    return;
  }



  // create role for bot
  const roleId = flake.gen();
  await Roles.updateOne({server: req.server._id, default: true}, {$inc: {order: 2}})
  const doc = {
    name: bot.username,
    id: roleId,
    permissions: permissions,
    server: req.server._id,
    deletable: false,
    bot: bot._id,
    server_id: req.server.server_id,
    order: 0
  };
  await Roles.create(doc);

  const data = {
    name: doc.name,
    permissions: doc.permissions,
    deletable: false,
    botRole: true,
    hideRole: true,
    id: roleId,
    server_id: server_id,
    order: 0
  };
  const io = req.io;
  io.in("server:" + req.server.server_id).emit("server:create_role", data);
  
  
  // ready to perform join action

  joinServer(req.server, bot, undefined, req, res, roleId, "BOT");

}