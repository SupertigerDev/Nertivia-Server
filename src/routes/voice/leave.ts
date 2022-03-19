import { NextFunction, Request, Response } from "express";
import { USER_CALL_LEFT } from "../../ServerEventNames";
import { getIOInstance } from "../../socket/socket";
import * as VoiceCache from '../../cache/Voice.cache';

export async function leaveCall (req: Request, res: Response, next: NextFunction) {

  const voiceUser = await VoiceCache.getVoiceUserByUserId(req.user.id);
  if (!voiceUser) {
    return res.status(403).send("You're not in a call!")
  }

  await VoiceCache.removeUser(req.user.id)

  if (voiceUser.serverId) {
    getIOInstance().in("server:" + voiceUser.serverId).emit(USER_CALL_LEFT, {channelId: voiceUser.channelId, userId: req.user.id})
  }
  res.json({success: true})
}