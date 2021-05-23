import { Request, Response, NextFunction } from "express";
const Users = require("../../models/users");
const Servers = require("../../models/servers");
const Messages = require("../../models/messages");

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const userCount = await Users.find({}).estimatedDocumentCount()
  const serverCount = await Servers.find({}).estimatedDocumentCount()
  const messageCount = await Messages.find({}).estimatedDocumentCount()
  res.json({userCount, serverCount, messageCount});
};
