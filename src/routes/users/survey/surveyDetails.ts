import {Request, Response} from 'express';
import { Users } from "../../../models/Users";

export async function surveyDetails(req: Request, res: Response) {
  const result = await Users.findById(req.user._id, "about_me").lean();

  if (!result?.about_me) {
    return res.status(403).json({
      message: "about_me does not exist."
    });
  }
  res.json({
    result: {...result.about_me, _id: undefined}
  });
};
