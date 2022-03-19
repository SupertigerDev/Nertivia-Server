import { Socket } from "socket.io";
import * as UserCache from '../../cache/User.cache';
import * as VoiceCache from '../../cache/Voice.cache';
import { USER_PROGRAM_ACTIVITY_CHANGED, USER_CALL_LEFT } from "../../ServerEventNames";
import emitUserStatus from "../../socketController/emitUserStatus";
import { emitToFriendsAndServers } from "../socket";
import {getIOInstance} from '../socket'
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

  const voiceUser = await VoiceCache.getVoiceUserByUserId(user.id);
  if (voiceUser?.socketId === client.id) {
    await VoiceCache.removeUser(user.id);
    if (voiceUser.serverId) {
      getIOInstance().in("server:" + voiceUser.serverId).emit(USER_CALL_LEFT, {channelId: voiceUser.channelId, userId: user.id})
    }
  }
  
  if (!programActivityRemoved) {
    emitToFriendsAndServers({
      event: USER_PROGRAM_ACTIVITY_CHANGED,
      data: {user_id: user.id},
      userObjectId: user._id
    })
  }

}