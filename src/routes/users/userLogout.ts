import { Request, Response } from 'express';
import * as UserCache from '../../cache/User.cache';

export async function userLogout(req: Request, res: Response) {
  await UserCache.removeUser(req.user.id);
  res.status(204).end();
};
