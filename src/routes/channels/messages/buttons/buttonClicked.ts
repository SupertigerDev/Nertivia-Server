import { Request } from 'express';
import { Response } from 'express-serve-static-core';
import {Messages} from '../../../../models/Messages'
import { MESSAGE_BUTTON_CLICKED } from '../../../../ServerEventNames';

interface ResponseObject {
  id: string,
  channelId: string,
  messageId: string,
  clickedById: string,
  serverId?: string,
}

export async function buttonClicked (req: Request, res: Response){
  const { channelId, messageId, buttonId } = req.params;
  

  const message = await Messages.findOne({ channelID: channelId, messageID: messageId, "buttons.id": buttonId }).select("creator").populate("creator", "id");
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;

  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }

  const io = req.io;
  const resObj: ResponseObject = {
    id: buttonId,
    channelId: channelId,
    messageId: messageId,
    clickedById: user.id
  }
  if (server) {
    resObj.serverId = server.server_id
  }

  io.in(message.creator.id).emit(MESSAGE_BUTTON_CLICKED, resObj)
  res.status(200).json({message: "Waiting for bot response..."});
};