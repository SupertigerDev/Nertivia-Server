import { NextFunction, Request, Response } from "express-serve-static-core";

import {Users} from "../../../models/Users";

export const deleteHtmlProfile = async (req: Request, res: Response, next: NextFunction) => {
  await Users.updateOne({_id: req.user._id}, {$unset: {htmlProfile: 1}})
  res.status(200).json({status: "done"})
};
