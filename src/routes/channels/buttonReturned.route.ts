import { Request, Router } from 'express';
import { Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { channelVerify } from '../../middlewares/channelVerify.middleware';
import rateLimit from '../../middlewares/rateLimit';
import {Messages} from '../../models/Messages'
import { MESSAGE_BUTTON_CALLBACK } from '../../ServerEventNames';

interface ResponseObject {
  id: string,
  channelId: string,
  messageId: string,
  serverId?: string,
  message: string,
}



export const buttonReturned = (Router: Router) => {
  Router.route("/:channelId/messages/:messageId/buttons/:buttonId").patch(
    authenticate({allowBot: true}),
    channelVerify,
    rateLimit({name: 'message_button_returned', expire: 60, requestsLimit: 300 }),
    route
  );
} 

async function route (req: Request, res: Response){
  const { channelId, messageId, buttonId } = req.params;
  const { message, clickedById } = req.body; 
  

  const messageDB = await Messages.findOne({ channelID: channelId, messageID: messageId, "buttons.id": buttonId }).select("creator");
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;

  if (!messageDB) {
    return res.status(404).json({ message: "Message was not found." });
  }

  if (user._id !== messageDB.creator._id.toString()) {
    return res.status(403).json({ message: "You are not the message creator." });
  }
  if (message && message.length >= 60) {
    return res.status(403).json({ message: "Message can only contain less than 60 characters." });
  } 
  if (!clickedById) {
    return res.status(403).json({ message: "clickedById is required." });
  }
  const io = req.io;
  const resObj: ResponseObject = {
    id: buttonId,
    channelId,
    messageId,
    message
  }
  if (server) {
    resObj.serverId = server.server_id
  }

  io.in(clickedById).emit(MESSAGE_BUTTON_CALLBACK, resObj)

  res.status(200).json({message: "Response Sent!"});
};