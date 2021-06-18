import { Request, Response } from "express";
const redis = require("../../redis");
import Users from "../../models/users";
import socketio from 'socket.io'

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


async function kickBot(io: any, bot_id: string) {
  await redis.deleteSession(bot_id);
  io.in(bot_id).clients((err: any, clients: any[]) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      io.to(id).emit("auth_err", "Token outdated.");
      io.of('/').adapter.remoteDisconnect(id, true) 
    }
  });
}
