import { Request, Response, NextFunction } from "express";
const Servers = require("../../models/servers");

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const servers = await Servers.find({}, { _id: 0 })
    .select("avatar server_id created name creator")
    .populate("creator", "username uniqueID")
    .sort({ _id: -1 })
    .limit(30)
    .lean();
  res.json(servers);
};
