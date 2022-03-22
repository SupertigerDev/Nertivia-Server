import mongoose from "mongoose";
import { emitToFriendsAndServers, getIOInstance } from "../socket/socket";
import { USER_STATUS_CHANGED, SELF_STATUS_CHANGE } from "../ServerEventNames";


interface EmitStatusOptions {
  userId: string, 
  userObjectId: string | mongoose.Types.ObjectId, 
  status: number,
  emitOffline?: boolean,
  customStatus?: string,
  connected?: boolean
}

const defaultOptions = {
  emitOffline: true,
  connected: false,
}
// user_id, id, status, io, emitOffline = true, customStatus, connected = false
export default function emitUserStatus(_opts: EmitStatusOptions) {
  const opts = {...defaultOptions, ..._opts}

    // dont emit if the status is offline (0)
    if (!opts.emitOffline && opts.status === 0) return;

    const payload = { 
      user_id: opts.userId, 
      status: opts.status,
      ...(opts.connected && {custom_status: opts.customStatus}),
      ...(opts.connected && {connected: true}),
    }

    emitToFriendsAndServers({
      event: USER_STATUS_CHANGED,
      data: payload,
      userObjectId: opts.userObjectId
    })
    getIOInstance().in(opts.userId).emit(SELF_STATUS_CHANGE, {status: payload.status});
}
