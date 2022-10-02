import {  Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

import {Users} from "../../models/Users";

export const htmlProfileDelete = (Router: Router) => {
  Router.route('/html-profile')
    .delete(authenticate(), route);
}
const route = async (req: Request, res: Response) => {
  await Users.updateOne({_id: req.user._id}, {$unset: {htmlProfile: 1}})
  res.status(200).json({status: "done"})
};
