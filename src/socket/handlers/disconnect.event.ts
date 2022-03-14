import { Socket } from "socket.io";
import * as UserCache from '../../cache/User.cache';
import { USER_PROGRAM_ACTIVITY_CHANGED } from "../../ServerEventNames";
import emitUserStatus from "../../socketController/emitUserStatus";
import { emitToFriendsAndServers } from "../socket";

export async function onDisconnect(client: Socket) {
  const [user, error] = await UserCache.getUserBySocketId(client.id);
  if (!user || error) return;

  const {presenceRemoved, programActivityRemoved} = await UserCache.removeConnectedUser(client.id, user.id);

  if (!presenceRemoved) {
    emitUserStatus({
      userId: user.id,
      userObjectId: user._id,
      status: 0,
    })
  }
  
  if (!programActivityRemoved) {
    emitToFriendsAndServers({
      event: USER_PROGRAM_ACTIVITY_CHANGED,
      data: {user_id: user.id},
      userObjectId: user._id
    })
  }

}