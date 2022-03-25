import { Request, Response, Router } from "express";
import { USER_CALL_LEFT } from "../../ServerEventNames";
import { getIOInstance } from "../../socket/socket";
import * as VoiceCache from '../../cache/Voice.cache';
import { authenticate } from "../../middlewares/authenticate";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

export async function voiceLeaveCall (Router: Router) { 
  Router.route("/leave").post(
    authenticate({allowBot: true}),
    rateLimit({name: 'leave_voice', expire: 20, requestsLimit: 15 }),
    route
  );
}
async function route (req: Request, res: Response) {

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