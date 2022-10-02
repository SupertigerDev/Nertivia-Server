import { Message } from '../../models/Messages';
import { Request, Response, Router } from "express";
import { Document, FilterQuery, LeanDocument } from "mongoose";
import { Messages } from "../../models/Messages";
import { MESSAGE_DELETED_BULK } from '../../ServerEventNames';
import { authenticate } from '../../middlewares/authenticate';
import {rateLimit} from '../../middlewares/rateLimit.middleware';
import { channelVerify } from '../../middlewares/channelVerify.middleware';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import checkRolePermissions from '../../middlewares/checkRolePermissions';
import permissions from '../../utils/rolePermConstants';



export function messageDeleteBulk(Router: Router) {
  Router.route("/:channelId/messages/bulk").delete(
    authenticate({allowBot: true}),
    rateLimit({name: 'message_delete_bulk', expire: 60, requestsLimit: 10 }),
    channelVerify,
    disAllowBlockedUser,
    checkRolePermissions('Admin', permissions.roles.ADMIN, false),
    route
  );
};


async function route (req: Request, res: Response) {
  const { channelId } = req.params;
  const { ids } = req.body;
  const channel = req.channel;
  const server = channel.server;
  const io = req.io;

  if (!Array.isArray(ids)) {
    return res.status(403).json({ message: "Please provide an array of ids." });
  }

  if (ids.length < 2 || ids.length > 200) {
    return res
      .status(403)
      .json({ message: "Please provide more than 1 and less than 200 ids." });
  }

  let messageIds: string[] = [];

  // if im in dms or not admin in servers, im only allowed to delete my own messages.
  if (!server || req.permErrorMessage) {
    messageIds = await findMessages({
      messageID: { $in: ids },
      creator: req.user._id,
      channelId: channelId,
    });
  }

  // if im in a server and im the admin, delete anyones message
  if (server && !req.permErrorMessage) {
    messageIds = await findMessages({
      messageID: { $in: ids },
      channelId: channelId,
    });
  }

  await Messages.deleteMany({messageID: { $in: messageIds}})

  const response = {
    channelId,
    messageIds,
  }


  res.json(response)

  if (!messageIds.length) return;

  if (!server) {
    io.in(req.user.id).emit(MESSAGE_DELETED_BULK, response);
    io.in(channel.recipients[0].id).emit(MESSAGE_DELETED_BULK, response);
  }
  if (server) {
    io.in("server:" + server.server_id).emit(MESSAGE_DELETED_BULK, response);
  }
};

async function findMessages(filter: FilterQuery<Message>) {
  return messagesToIds(await Messages.find(filter).limit(200).select("-_id messageID").lean());
}

function messagesToIds(messages: LeanDocument<Message & Document<any, any>>[]) {
  return messages.map((message) => message.messageID)
}
