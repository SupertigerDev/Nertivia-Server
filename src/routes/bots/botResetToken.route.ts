import { Request, Response, Router } from "express";
import {Users} from '../../models/Users';
import SocketIO from 'socket.io'
import JWT from 'jsonwebtoken'
import * as UserCache from '../../cache/User.cache'

import { AUTHENTICATION_ERROR } from "../../ServerEventNames";
import { authenticate } from "../../middlewares/authenticate";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

export function botResetToken (Router: Router) {
  Router.route("/:bot_id/reset-token").post(
    authenticate(),
    rateLimit({name: 'reset_bot_token', expire: 60, requestsLimit: 5 }),
    route
  );
}

async function route(req: Request, res: Response) {
  const { bot_id } = req.params;

  const bot: any = await Users.findOne({createdBy: req.user._id, id: bot_id}).select("passwordVersion").lean();
  if (!bot) {
    res.status(403).json({message: "Could not find bot."})
    return;
  }

  await Users.updateOne({_id: bot._id}, {$inc: { passwordVersion: 1 }});

  res.json({token: JWT.sign(`${bot_id}-${bot.passwordVersion ? bot.passwordVersion + 1 : 1 }`, process.env.JWT_SECRET).split(".").splice(1).join(".")})

  kickBot(req.io, bot_id);
}



async function kickBot(io: SocketIO.Server, bot_id: string) {
  await UserCache.removeUser(bot_id);

  io.in(bot_id).emit(AUTHENTICATION_ERROR, "Token outdated.");
  io.in(bot_id).disconnectSockets(true);
}

