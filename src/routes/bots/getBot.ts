import { Request, Response } from "express";
import { Users } from "../../models/Users";
import {Servers} from '../../models/Servers';
import { sign } from "jsonwebtoken";
import {ServerMembers} from '../../models/ServerMembers';
import { ServerRoles } from "../../models/ServerRoles";
import { roles } from '../../utils/rolePermConstants'

export default async function createBot(req: Request, res: Response) {
  const { bot_id } = req.params;
  const { token, myservers } = req.query;

  let servers: any[] | undefined;
  const bot: any = await Users.findOne({ id: bot_id, bot: true }, { _id: 0 })
    .select("avatar tag id username createdBy passwordVersion botPrefix botCommands")
    .populate("createdBy", "username tag avatar id")
    .lean();

  if (!bot || !bot.createdBy) {
    res.status(404).json({ message: "Bot not found." })
    return;
  }

  if (token && req.user && bot.createdBy._id.toString() === req.user._id) {
    bot.token = sign(bot.id + (bot.passwordVersion !== undefined ? `-${bot.passwordVersion}` : ''), process.env.JWT_SECRET)
      .split(".")
      .splice(1)
      .join(".");
  }
  delete bot.createdBy._id;

  if (myservers && req.user) {
    const myServers = await Servers.find({ creator: req.user._id }).select("name server_id avatar").lean();
    const myServer_ids = myServers.map((ms: any) => ms._id);

    const sm = await ServerMembers.find({ member: req.user._id, roles: { $exists: true, $not: { $size: 0 } } }, { _id: 0 }).select("roles").lean();
    servers = [...myServers, ...(await ServerRoles
      .find({ servers: { $nin: myServer_ids }, permissions: { $bitsAllSet: roles.ADMIN }, id: { $in: (sm.map((s: any) => s.roles) as any).flat() } }, { _id: 0 })
      .select("server").populate("server", "name server_id")
      .lean()).map((s: any) => s.server)]

    // filter duplicates
    servers = servers.filter((val, i) =>
      servers?.findIndex(v => v.server_id === val.server_id) === i
    )
  }



  res.json(servers ? { bot, servers } : bot);

}