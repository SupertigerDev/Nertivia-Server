import { Request, Response, Router } from 'express';
import { Messages } from '../../models/Messages'

import { authenticate } from '../../middlewares/authenticate';
import { channelVerification } from '../../middlewares/ChannelVerification';
import rateLimit from '../../middlewares/rateLimit';

export const messageGet = (Router: Router) => {
  Router.route("/:channelId/messages/:messageId").get(
    authenticate(true),
    rateLimit({name: 'message_load', expire: 60, requestsLimit: 120 }),
    channelVerification,
    route
  );
}

async function route (req: Request, res: Response){
  const { channelId, messageId } = req.params;

  const populate = [{
    path: "creator",
    select: "avatar username id tag admin -_id bot"
  }, {
    path: "mentions",
    select: "avatar username id tag admin -_id"
  }, {
    path: "quotes",
    select: "creator message -_id",
    populate: {
      path: "creator",
      select: "avatar username id tag admin -_id",
      model: "users"
    }
  }
  ]

  // Get message
  let message = await Messages.findOne(
    {
      channelID: channelId,
      messageID: messageId
    },
    "-__v -_id"
  )
    .populate(populate)
    .lean();

  if (!message) {
    return res.status(404).json({
      message: "Invalid channelId or messageId"
    });
  }

  return res.json(message);
};
