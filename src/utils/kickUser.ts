import { deleteSession } from "../newRedisWrapper";
import { AUTHENTICATION_ERROR } from "../ServerEventNames";
import { getIOAdapter, getIOInstance } from "../socket/instance";
const redis = require("../redis");

// excludeSocketID: emit to everyone BUT excludeSocketID
export async function kickUser(userID: string, message: string, excludeSocketID?: string) {
  const io = getIOInstance();

  await deleteSession(userID);
  

  io.in(userID).allSockets().then(clients => {
    clients.forEach(socket_id => {
      if (excludeSocketID === socket_id) return;
      io.to(socket_id).emit(AUTHENTICATION_ERROR, message);
      getIOAdapter().remoteDisconnect(socket_id, true)
    })
  })

}