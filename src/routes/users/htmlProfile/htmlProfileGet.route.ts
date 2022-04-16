import { Request, Response, Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";

import {Users} from "../../../models/Users";

export const htmlProfileGet = (Router: Router) => {
  Router.route('/')
    .get(authenticate(), route);
}

const route = async (req: Request, res: Response) => {
  const user = await Users.findOne({_id: req.user._id}).select("htmlProfile")
  if (!user) return res.status(404).json("User not found")
  if (!user.htmlProfile) return res.status(404).json("Html profile does not exist.")
  res.status(200).json(user.htmlProfile)
};
