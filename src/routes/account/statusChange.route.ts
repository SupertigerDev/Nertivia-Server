

import { Users } from "../../models/Users";
import emitUserStatus from '../../socketController/emitUserStatus'
import * as UserCache from '../../cache/User.cache';
import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

import settingsPolicy from "../../policies/settingsPolicies";

export async function statusChange(Router: Router) {
  Router.route("/status").post(
    authenticate({ allowBot: true }),
    rateLimit({ name: 'messages_load', expire: 60, requestsLimit: 50 }),
    settingsPolicy.status,
    route
  );
}

export async function route(req: Request, res: Response) {
  const { status } = req.body;
  const beforePresence = await UserCache.getPresenceByUserId(req.user.id);


  await Users.updateOne({ _id: req.user._id },
    { $set: { "status": status } })
  // change the status in redis.
  await UserCache.updatePresence(req.user.id, {status})


  // emit status to users.
  if (beforePresence?.status === 0) {
    emitUserStatus({
      userId: req.user.id,
      userObjectId: req.user._id,
      emitOffline: false,
      status,
      customStatus: beforePresence.custom,
      connected: true,
    })

  } else {
    emitUserStatus({
      userId: req.user.id,
      userObjectId: req.user._id,
      status,
    })
  }
  res.json({
    status: true,
    set: status
  });
};
