import {Server} from "http";
import socketIO from "socket.io";

import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import * as redis from '../common/redis';
import { onConnection } from "./handlers/connection.event";
import mongoose from "mongoose";
import { Friends } from "../models/Friends";
import { User, Users } from "../models/Users";

let IO_INSTANCE: socketIO.Server | undefined = undefined;

export function getIOInstance(server?: Server) {
  if (IO_INSTANCE) {
    return IO_INSTANCE;
  }
  IO_INSTANCE = new socketIO.Server(server, {
    transports: ["websocket"],
    cors: {
      allowedHeaders: "Content-Type, Authorization",
      origin: JSON.parse(process.env.ALLOWED_ORIGINS),
      credentials: true,
    }
  })
  IO_INSTANCE.adapter(createAdapter(redis.client, redis.client.duplicate()))

  IO_INSTANCE.on("connection", onConnection)

  return IO_INSTANCE;
}

export function getIOAdapter() {
  return getIOInstance().of('/').adapter as RedisAdapter;
}

export function ioInstanceExists() {
  return IO_INSTANCE !== undefined;
}

interface FriendsAndServersOptions {
  event: string;
  userObjectId: string | mongoose.Types.ObjectId;
  data: any;
  emitToSelf?: boolean;
}

export async  function emitToFriendsAndServers (_opts: FriendsAndServersOptions) {
  const io = getIOInstance();

  const opts: FriendsAndServersOptions = {emitToSelf: true, ..._opts}

  const friends = await Friends.find({requester: opts.userObjectId}).populate<{recipient: User}>('recipient', "id");
  const user = await Users.findById(opts.userObjectId).populate('servers', "server_id");

  if (!friends || !user) return;

  const rooms: string[] = [];

  for (let index = 0; index < user.servers.length; index++) {
    const server = user.servers[index];
    rooms.push("server:" + server.server_id);
  }

  for (let index = 0; index < friends.length; index++) {
    const friend = friends[index];
    rooms.push(friend.recipient.id);
  }

  if (opts.emitToSelf) rooms.push(user.id);

  io.to(rooms).emit(opts.event, opts.data);
}