import {Server} from "http";
import socketIO from "socket.io";
import config from "../config.js";

let IO_INSTANCE: socketIO.Server | undefined = undefined;

export function getIOInstance(server?: Server) {
  if (IO_INSTANCE) {
    return IO_INSTANCE;
  } else {
    IO_INSTANCE = socketIO(server, {
      perMessageDeflate: false,
      handlePreflightRequest: function(req, res) {
        var headers = {
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Origin": config.allowedOrigins,
          "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
      }
    });
    return IO_INSTANCE;
  }
}

export function ioInstanceExists() {
  return IO_INSTANCE !== undefined;
}
