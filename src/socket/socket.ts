import {Server} from "http";
import socketIO from "socket.io";

import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import * as redis from '../common/redis';
import { onConnection } from "./handlers/connection.event";

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

export function emitToFriendsAndServers () {
  
}