import { Request, Response } from "express";
const redis = require("../../redis");
import {Users} from "../../models/Users";
import SocketIO from 'socket.io'
import { deleteSession } from "../../newRedisWrapper";
import { AUTHENTICATION_ERROR } from "../../ServerEventNames";

export default async function deleteBot(req: Request, res: Response) {
  const { bot_id } = req.params;
  try {
    const bot: any = await Users.exists({
      id: bot_id,
      bot: true,
      createdBy: req.user._id,
    });
    if (!bot) return res.status(404).json({ message: "Bot not found." });

    let error = false;
    await Users.updateOne(
      { id: bot_id },
      {
        $set: {
          username: "Deleted Bot " + (Math.floor(Math.random() * 100000) + 1),
          created: 0
        },
        $unset: {
          createdBy: 1,
          botCommands: 1,
          badges: 1,
          about_me: 1,
          custom_status: 1,
          avatar: 1,
        }, 
        $inc: {passwordVersion: 1}
      }
    ).catch((err: any) => {
      console.log(err)
      error = true;
    });
    if (error) {
      res
        .status(403)
        .json({ message: "Something went wrong while storing to database." });
      return;
    }
    kickBot(req.io, bot_id);

    res.json({ message: "success" });
  } catch (err) {
    res.json({ message: err });
  }
}


async function kickBot(io: SocketIO.Server, bot_id: string) {
  await deleteSession(bot_id);

  io.in(bot_id).emit(AUTHENTICATION_ERROR, "Token outdated.");
  io.in(bot_id).disconnectSockets(true);
}
