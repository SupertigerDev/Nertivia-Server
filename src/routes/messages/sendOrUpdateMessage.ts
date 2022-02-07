import {Request, Response, NextFunction} from 'express';

import { createMessage } from '../../services/Messages';

export default async (req: Request, res: Response, next: NextFunction) => {
  const { channelID, messageID } = req.params;
  let { tempID, socketID, buttons, htmlEmbed, message: content } = req.body;


  const t1 = performance.now();
  const message = await createMessage({
    tempId: tempID,
    htmlEmbed,
    buttons,
    file: req.uploadFile?.file,
    channelId: channelID,
    content: content,
    channel: req.channel,
    creator: req.user,
    socketId: socketID
  }).catch(err => {
    res.status(err.statusCode).json({message: err.message});
  })
  if (!message) return;
  res.json(message);
  const t2 = performance.now();
  console.log(`Message took ${Math.round(t2 - t1)}ms to send.`);  

};
