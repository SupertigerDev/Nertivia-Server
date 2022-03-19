import { Socket } from "socket.io";
import * as UserCache from "../../cache/User.cache";
import * as VoiceCache from "../../cache/Voice.cache";
import { VOICE_SIGNAL_RECEIVED } from "../../ServerEventNames";
import { getIOInstance } from "../socket";

interface Payload {
  channelId: string,
  signalToUserId: string, 
  signal: string
}

export async function onVoiceSendSignal(client: Socket, payload: Payload) {
  const userId = await UserCache.getUserIdBySocketId(client.id);
  if (!userId) return;
  
  const isUserInVoice = await VoiceCache.isUserInVoice(payload.channelId, userId)
  const recipientVoice = await VoiceCache.getVoiceUserByUserId(payload.signalToUserId);

  if (!isUserInVoice || !recipientVoice) return;
  if (recipientVoice.channelId !== payload.channelId) return;

  getIOInstance().to(recipientVoice.socketId).emit(VOICE_SIGNAL_RECEIVED, {
    channelId: payload.channelId,
    requesterId: userId,
    signal: payload.signal
  })
}