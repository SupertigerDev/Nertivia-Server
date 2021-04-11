import { Request, Response, NextFunction } from "express";
const Users = require("../../models/users");

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const users = await Users.find({}, { _id: 0 })
    .select("avatar id email username tag ip created banned")
    .sort({ _id: -1 })
    .limit(30)
    .lean();
  res.json(users);
};
