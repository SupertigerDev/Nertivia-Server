import { Request, Response, Router } from 'express';
import * as UserCache from '../../cache/User.cache';
import { authenticate } from '../../middlewares/authenticate';

export function userLogout(Router: Router) {
  Router.route("/logout").delete(
    authenticate({allowBot: true}),
    route
  );
}
async function route(req: Request, res: Response) {
  await UserCache.removeUser(req.user.id);
  res.status(204).end();
};
