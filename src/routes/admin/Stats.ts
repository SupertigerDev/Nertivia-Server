import { Request, Response, NextFunction } from "express";
const Users = require("../../models/users");
const Servers = require("../../models/servers");
import {Messages} from '../../models/Messages'

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const userCount = await Users.estimatedDocumentCount()
  const serverCount = await Servers.estimatedDocumentCount()
  const messageCount = await Messages.estimatedDocumentCount()
  res.json({userCount, serverCount, messageCount});
};
