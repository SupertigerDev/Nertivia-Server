import { Socket } from "socket.io";
import * as UserCache from '../../cache/User.cache';
import { USER_PROGRAM_ACTIVITY_CHANGED } from "../../ServerEventNames";
interface Payload {
  name?: string;
  status?: string;
}

export async function onProgramActivitySet(client: Socket, data?: Payload) {
  const [user, error] = await UserCache.getUserBySocketId(client.id);
  if (error || !user) return;

  if (!data) {
    await UserCache.updateProgramActivity(user.id, null);
    emitToAll(USER_PROGRAM_ACTIVITY_CHANGED, user._id, { user_id: user.id }, getIOInstance())
    return;
  }


  const name = data.name?.substring(0, 100)

  const status = data.status?.substring(0, 100)

  await UserCache.updateProgramActivity(user.id, { name: data.name, status: data.status, socketID: client.id });

  // only emit if: 
  // json is empty
  // json is not the same.
  if ((json && (json.name !== data.name || json.status !== data.status)) || (!json)) {
    emitToAll(USER_PROGRAM_ACTIVITY_CHANGED, user._id, { name: data.name, status: data.status, user_id: user.id }, getIOInstance())
  }


}