import { Request, Response } from "express";
import { Users } from "../../models/Users";

export async function welcomeDone(req: Request, res: Response) {
  await Users.findOneAndUpdate({ _id: req.user._id }, { $unset: {show_welcome: 1} })
  res.json({
    message: "Saved!"
  });
};
