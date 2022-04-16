import { Users } from "../../models/Users";
import * as UserCache from '../../cache/User.cache';
import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

export function termsAgree(Router: Router) {
  Router.route("/agree-terms").post(
    authenticate({skipTerms: true}),
    route
  );

}
async function route(req: Request, res: Response) {
  await UserCache.removeUser(req.user.id);
  await Users.updateOne({id: req.user.id}, {$set: {readTerms: true}});
  res.json({success: true})
}