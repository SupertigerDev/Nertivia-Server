import { NextFunction, Request, Response } from "express-serve-static-core";
import {getUserInVoiceByUserId, removeUserFromVoice } from "../../newRedisWrapper";
import { getIOInstance } from "../../socket/instance";

export async function leaveCall (req: Request, res: Response, next: NextFunction) {

  const [voiceDetails, err1] = await getUserInVoiceByUserId(req.user.id);
  if (!voiceDetails) {
    return res.status(403).send("You're not in a call!")
  }

  await removeUserFromVoice(req.user.id)

  if (voiceDetails.serverId) {
    getIOInstance().in("server:" + voiceDetails.serverId).emit("user:left_call", {channelId: voiceDetails.channelId, userId: req.user.id})
  }
  res.json({success: true})


}