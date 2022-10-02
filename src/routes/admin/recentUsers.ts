import { Request, Response, NextFunction } from "express";
import { Users } from "../../models/Users";

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const users = await Users.find({})
    .select("-_id avatar id email username tag ip created banned bot banner")
    .sort({ _id: -1 })
    .limit(30)
    .lean();
  res.json(users);
};
