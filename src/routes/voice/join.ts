import { NextFunction, Request, Response } from "express";
import { USER_CALL_JOINED } from "../../ServerEventNames";
import { getIOInstance } from "../../socket/socket";

import * as VoiceCache from '../../cache/Voice.cache';
import * as UserCache from '../../cache/User.cache';
export async function joinCall (req: Request, res: Response, next: NextFunction) {
  const socketId = req.body.socketId;

  const isInVoice = await VoiceCache.getVoiceUserByUserId(req.user.id);
  if (isInVoice) {
    return res.status(403).send("Already in a call!")
  }

  const serverId = req.channel?.server?.server_id;

  await VoiceCache.addUser({
    channelId: req.channel.channelId,
    socketId,
    userId: req.user.id,
    serverId: serverId,
  })
  
  if (serverId) {
    getIOInstance().in("server:" + serverId).emit(USER_CALL_JOINED, {channelId: req.channel.channelId, userId: req.user.id})
  }
  res.json({success: true})


}