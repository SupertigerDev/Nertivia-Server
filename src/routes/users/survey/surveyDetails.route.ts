import {Request, Response, Router} from 'express';
import { authenticate } from '../../../middlewares/authenticate';
import { Users } from "../../../models/Users";

export function surveyDetails(Router: Router) {
  Router.route('/')
  .get(authenticate({allowBot: true}), route);
}

async function route(req: Request, res: Response) {
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
