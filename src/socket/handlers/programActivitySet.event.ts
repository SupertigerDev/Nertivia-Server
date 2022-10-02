import { Socket } from "socket.io";
import * as UserCache from '../../cache/User.cache';
import { USER_PROGRAM_ACTIVITY_CHANGED } from "../../ServerEventNames";
import { emitToFriendsAndServers } from "../socket";
interface Payload {
  name?: string;
  status?: string;
}

export async function onProgramActivitySet(client: Socket, data?: Payload) {
  const [user, error] = await UserCache.getUserBySocketId(client.id);
  if (error || !user) return;

  if (!data) {
    await UserCache.updateProgramActivity(user.id, null);
    emitToFriendsAndServers({
      event: USER_PROGRAM_ACTIVITY_CHANGED,
      data: { user_id: user.id },
      userObjectId: user._id,
    })
    return;
  }

  const oldProgramActivity = await UserCache.getUserProgramActivity(user.id);

  const name = data.name?.substring(0, 100)
  const status = data.status?.substring(0, 100)

  await UserCache.updateProgramActivity(user.id, { name: data.name, status: data.status, socketId: client.id });

  if (name !== oldProgramActivity?.name || status !== oldProgramActivity?.status) {
    emitToFriendsAndServers({
      event: USER_PROGRAM_ACTIVITY_CHANGED,
      data: { name: data.name, status: data.status, user_id: user.id },
      userObjectId: user._id,
    })
  }
}