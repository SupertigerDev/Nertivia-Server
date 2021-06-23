import { Request, Response, NextFunction } from "express";
const Users = require("../../models/users");
const Servers = require("../../models/servers");
import {MessageModel} from '../../models/Message'

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const userCount = await Users.estimatedDocumentCount()
  const serverCount = await Servers.estimatedDocumentCount()
  const messageCount = await MessageModel.estimatedDocumentCount()
  res.json({userCount, serverCount, messageCount});
};
