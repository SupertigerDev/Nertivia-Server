import {Request, Response, Router} from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { acceptRequest } from "../../services/Friends";

import relationshipPolicy from '../../policies/relationshipPolicies';

export const friendAccept = (Router: Router) => {
  Router.route('/relationship')
    .put(authenticate(), relationshipPolicy.put, route);
}

async function route(req: Request, res: Response) {
  const friendId = req.body.id;

  acceptRequest(req.user.id, friendId)
    .then(response => {
      res.status(200).json({message: response.message});
    })
    .catch(err => {
      res.status(err.status || 500).json({ errors: [{param: "all", msg: err.message}]});
    })
}