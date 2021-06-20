import {Server} from "http";
import socketIO from "socket.io";

import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter';
import { getRedisInstance } from "../redis/instance";

let IO_INSTANCE: socketIO.Server | undefined = undefined;

export function getIOInstance(server?: Server) {
  if (IO_INSTANCE) {
    return IO_INSTANCE;
  } else {
    IO_INSTANCE = new socketIO.Server(server, {
      transports: ["websocket"],
      cors: {
        allowedHeaders: "Content-Type, Authorization",
        origin: JSON.parse(process.env.ALLOWED_ORIGINS),
        credentials: true,
      }
    })
    IO_INSTANCE.adapter(createAdapter(getRedisInstance(), getRedisInstance()?.duplicate()))
  
    return IO_INSTANCE;
  }
}

export function getIOAdapter() {
  return getIOInstance().of('/').adapter as RedisAdapter;
}

export function ioInstanceExists() {
  return IO_INSTANCE !== undefined;
}
