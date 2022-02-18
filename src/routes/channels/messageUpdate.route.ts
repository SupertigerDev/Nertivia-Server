import { Request, Response, Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { channelVerification } from '../../middlewares/ChannelVerification';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import rateLimit from '../../middlewares/rateLimit';

import messagePolicy from '../../policies/messagePolicies';

import { updateMessage } from '../../services/Messages';

export const messageUpdate = (Router: Router) => {
  Router.route("/:channelId/messages/:messageId").patch(
    authenticate({allowBot: true}),
    messagePolicy.update,
    rateLimit({ name: 'message_update', expire: 20, requestsLimit: 15 }),
    channelVerification,
    disAllowBlockedUser,
    route
  );
}

interface Body {
  tempID?: string,
  socketID?: string,
  buttons: any[],
  htmlEmbed: any,
  // TODO: rename this to "content" (also in db)
  message: string
}

async function route(req: Request, res: Response) {
  const { messageId } = req.params;
  const body = req.body as Body;


  const message = await updateMessage({
    messageId,
    channel: req.channel,
    creator: req.user,
    socketId: body.socketID,
    tempId: body.tempID,
    htmlEmbed: body.htmlEmbed,
    buttons: body.buttons,
    content: body.message,
  }).catch(err => {
    console.log(err);
    return res.status(err.statusCode).send({ message: err.message });
  })
  if (!message) return;
  res.json({ ...message, tempID: body.tempID });
};



