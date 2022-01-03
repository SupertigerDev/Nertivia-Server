import { Request, Response, NextFunction } from "express";
import {AdminActions} from "../../models/AdminActions";

module.exports = async (_req: Request, res: Response, _next: NextFunction) => {
  const adminActions = await AdminActions.find({}, { _id: 0 }).populate("admin", "username id").populate("user", "username id")
    .sort({ _id: -1 })
    .limit(30)
    .lean();
  res.json(adminActions);
};
