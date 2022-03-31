import { User, Users } from "../../models/Users";
import { SELF_CUSTOM_STATUS_CHANGE } from "../../ServerEventNames";
import { emitToFriendsAndServers } from "../../socket/socket";
import * as UserCache from '../../cache/User.cache';
import { Request, Response, Router } from "express";
import {FilterQuery} from 'mongoose'
import { authenticate } from "../../middlewares/authenticate";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

export async function customStatusChange(Router: Router) {
  Router.route("/custom-status").post(
    authenticate({ allowBot: true }),
    rateLimit({ name: 'messages_load', expire: 60, requestsLimit: 50 }),
    route
  );
}

export async function route(req: Request, res: Response) {
  const io = req.io;
  const { custom_status } = req.body;

  let customStatus = custom_status && custom_status.trim() !== "" ? custom_status : null;

  if (customStatus) {
    if (customStatus.length >= 100) {
      return res.status(401).json("String too long.")
    }
    customStatus = customStatus.replace(/\n/g, " ")
  }

  const obj: FilterQuery<User> = {};
  if (!customStatus) {
    obj.$unset = {
      custom_status: 1
    }
  } else {
    obj.$set =  {
      custom_status: customStatus
    }
  }
  await Users.updateOne({_id: req.user._id}, obj)

  // change the status in redis.
  await UserCache.updatePresence(req.user.id, {
    custom: customStatus
  });

  // emit status to users.
  emitToFriendsAndServers({
    event: "member:custom_status_change",
    data: {user_id: req.user.id, custom_status: customStatus},
    userObjectId: req.user._id
  })

  io.in(req.user.id).emit(SELF_CUSTOM_STATUS_CHANGE, { custom_status: customStatus});
    

  res.json({
    custom_status: customStatus
  });
};
