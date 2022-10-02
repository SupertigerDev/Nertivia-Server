import {Request, Response, Router} from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { removeFriend } from "../../services/Friends";

import relationshipPolicy from '../../policies/relationshipPolicies';

export const friendRemove = (Router: Router) => {
  Router.route('/relationship')
    .delete(authenticate(), relationshipPolicy.delete, route);
}

async function route(req: Request, res: Response) {
  const friendId = req.body.id;

  removeFriend(req.user.id, friendId)
    .then(response => {
      res.status(200).json({message: response.message});
    })
    .catch(err => {
      res.status(err.status || 500).json({ errors: [{param: "all", msg: err.message}]});
    })
}