import {Request, Response, Router} from 'express';
import { authenticate } from '../../../middlewares/authenticate';
import { sendRequest } from "../../../services/Friends";

import relationshipPolicy from '../../../policies/relationshipPolicies';

export const friendRequest = (Router: Router) => {
  Router.route('/')
  .post(authenticate(), relationshipPolicy.post, route);
}

async function route(req: Request, res: Response) {
  const {username, tag} = req.body;
  sendRequest(req.user.id, username, tag)
    .then(response => {
      res.status(200).json({message: response.message});
    })
    .catch(err => {
      res.status(err.status || 500).json({ errors: [{param: "all", msg: err.message}]});
    })

}