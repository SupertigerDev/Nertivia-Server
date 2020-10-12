import { Request, Response } from "express";
const redis = require("../../redis");
import Users from "../../models/users";
import socketio from 'socket.io'

export default async function deleteBot(req: Request, res: Response) {
  const { bot_id } = req.params;
  try {
    const bot: any = await Users.exists({
      uniqueID: bot_id,
      bot: true,
      createdBy: req.user._id,
    });
    if (!bot) return res.status(404).json({ message: "Bot not found." });

    let error = false;
    await Users.updateOne(
      { uniqueID: bot_id },
      {
        $set: {
          username: "DeletedBot" + (Math.floor(Math.random() * 100000) + 1),
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
    ).catch((err) => {
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


async function kickBot(io: socketio.Server, uniqueID: string) {
  await redis.deleteSession(uniqueID);
  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (!rooms || !rooms.sockets) return;

  for (const clientId in rooms.sockets) {
    const client = io.sockets.connected[clientId];
    if (!client) continue;
    client.emit("auth_err", "Token outdated.");
    client.disconnect(true);
  }
}
