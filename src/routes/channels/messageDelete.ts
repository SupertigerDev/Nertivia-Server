import {Messages} from '../../models/Messages'

import {MessageQuotes} from '../../models/MessageQuotes'
import { MESSAGE_DELETED } from '../../ServerEventNames';
import { Request, Response, Router } from 'express';
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN'
import { authenticate } from '../../middlewares/authenticate';
import rateLimit from '../../middlewares/rateLimit';
import { channelVerification } from '../../middlewares/ChannelVerification';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import checkRolePermissions from '../../middlewares/checkRolePermissions';
import permissions from '../../utils/rolePermConstants';



export function messageDelete(Router: Router) {
  Router.route("/:channelId/messages/:messageId").get(
    authenticate(true),
    rateLimit({name: 'message_delete', expire: 60, requestsLimit: 120 }),
    channelVerification,
    disAllowBlockedUser,
    checkRolePermissions('Admin', permissions.roles.ADMIN, false),
    route
  );
};



async function route(req: Request, res: Response) {
  const { channelId, messageId } = req.params;

  const message = await Messages.findOne({ channelID: channelId, messageID: messageId });
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;
  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }


  if (server && req.permErrorMessage) {
    if (message.creator.toString() !== user._id) {
      return res.status(403).json(req.permErrorMessage)
    }
  }

  if (!server && message.creator.toString() !== req.user._id) {
    return res.status(403).json({ message: "Can't delete this message." });
  }

  try {
    await message.remove();
    if (message.quotes && message.quotes.length){
      await MessageQuotes.deleteMany({
        _id: {
          $in: message.quotes
        }
      })
    }
    const resObj = { channelID: channelId, messageID: messageId };
    res.json(resObj);
    const io = req.io;
    if (server) {
      io.in("server:" + server.server_id).emit(MESSAGE_DELETED, resObj);
    } else {
      io.in(user.id).emit(MESSAGE_DELETED, resObj);
      io.in(channel.recipients[0].id).emit(MESSAGE_DELETED, resObj);
    }

    // delete image if exists
    const filesExist = message.files && message.files.length;
    const isImage = filesExist && message.files?.[0].dimensions;
    const isNertiviaCDN = filesExist && message.files?.[0].url.startsWith("https://")
    if (filesExist && isImage && isNertiviaCDN) {
      const path = (new URL(message.files?.[0].url)).pathname;
      nertiviaCDN.deletePath(path).catch(err => {console.log("Error deleting from CDN", err)})
    }
  } catch (error) {
    console.error(error);
    res
      .status(403)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
