import { Request, Response, Router } from "express";
import { USER_CALL_JOINED } from "../../ServerEventNames";
import { getIOInstance } from "../../socket/socket";

import * as VoiceCache from '../../cache/Voice.cache';
import { authenticate } from "../../middlewares/authenticate";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { channelVerify } from "../../middlewares/channelVerify.middleware";

export async function voiceJoinCall (Router: Router) { 
  Router.route("/channels/:channelId").post(
    authenticate({allowBot: true}),
    rateLimit({name: 'join_voice', expire: 20, requestsLimit: 15 }),
    channelVerify,
    // checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
    route
  );
}
async function route (req: Request, res: Response) {
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