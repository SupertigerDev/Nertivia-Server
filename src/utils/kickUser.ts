import { getIOInstance } from "../socket/instance";
const redis = require("../redis");

// excludeSocketID: emit to everyone BUT excludeSocketID
export async function kickUser(userID: string, message: string, excludeSocketID?: string) {
  const io = getIOInstance();

  await redis.deleteSession(userID);
  io.in(userID).clients((err: any, clients: string[]) => {
    for (let i = 0; i < clients.length; i++) {
      const id = clients[i];
      if (excludeSocketID && excludeSocketID === id) continue;
      io.to(id).emit("auth_err", message);
      (io.of('/').adapter as any).remoteDisconnect(id, true)

    }
  })
}