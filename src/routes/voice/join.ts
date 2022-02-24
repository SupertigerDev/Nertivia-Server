import { NextFunction, Request, Response } from "express-serve-static-core";
import { addUserToVoice, getConnectedUserBySocketID, getUserInVoiceByUserId } from "../../newRedisWrapper";
import { USER_CALL_JOINED } from "../../ServerEventNames";
import { getIOInstance } from "../../socket/instance";

export async function joinCall (req: Request, res: Response, next: NextFunction) {
  const socketId = req.body.socketId;
  // check if socketId matches user id
  const [details, err] = await getConnectedUserBySocketID(socketId);
  if (!details?.id || details?.id !== req.user.id) {
    return res.status(403).send("Invalid Id!")
  }

  const [isAlreadyInCall, err1] = await getUserInVoiceByUserId(req.user.id);
  if (isAlreadyInCall) {
    return res.status(403).send("Already in a call!")
  }

  const data: any = {socketId};
  if (req.channel.server) {
    data.serverId = req.channel.server.server_id
  }
  await addUserToVoice(req.channel.channelId, req.user.id, data)
  
  if (data.serverId) {
    getIOInstance().in("server:" + data.serverId).emit(USER_CALL_JOINED, {channelId: req.channel.channelId, userId: req.user.id})
  }
  res.json({success: true})


}