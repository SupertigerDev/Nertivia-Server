
import {Request, Response, Router} from 'express';
import { Users } from "../../../models/Users";
import { matchedData } from 'express-validator';
import { authenticate } from '../../../middlewares/authenticate';

import surveyPolicy from '../../../policies/surveyPolicies';

export function surveyUpdate(Router: Router) {

  Router.route('/')
    .put(authenticate({allowBot: true}), surveyPolicy.put, route);
}

async function route(req: Request, res: Response) {
  const data = matchedData(req);
  Users.findOneAndUpdate({ _id: req.user._id }, { about_me: data }).exec(
    async function(err, item) {
      if (err) {
        return res.status(403).json({
          message: "Could not be updated."
        });
      }
      if (!item) {
        return res.status(404).json({
          message: "Users not found"
        });
      }
      res.json({
        message: "Saved!"
      });
    }
  );
};
