import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { Users } from "../../models/Users";

export function userWelcomeDone(Router: Router) {
  Router.route('/welcome-done')
    .post(authenticate(), route);
}

async function route(req: Request, res: Response) {
  await Users.findOneAndUpdate({ _id: req.user._id }, { $unset: {show_welcome: 1} })
  res.json({
    message: "Saved!"
  });
};
