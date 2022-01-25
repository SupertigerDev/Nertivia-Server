import { Router } from "express";

import permissions from '../../../utils/rolePermConstants';



import { authenticate } from "../../../middlewares/authenticate";
import { channelVerification } from "../../../middlewares/ChannelVerification";
import checkRolePermissions from "../../../middlewares/checkRolePermissions";
import disAllowBlockedUser from "../../../middlewares/disAllowBlockedUser";
import rateLimit from "../../../middlewares/rateLimit";

import { ButtonRouter } from "./buttons/ButtonRouter";
import { deleteMessageBulk } from "./deleteMessageBulk";
import { ReactionRouter } from "./reactions/ReactionRouter";
import { deleteMessage } from "./deleteMessage";

const MessageRouter = Router();




// delete message
MessageRouter.route("/:channelId/messages/:messageId").delete(
  authenticate(true),
  rateLimit({name: 'message_delete', expire: 60, requestsLimit: 120 }),
  channelVerification,
  disAllowBlockedUser,
  checkRolePermissions('Admin', permissions.roles.ADMIN, false),
  deleteMessage
);



// delete message bulk
MessageRouter.route("/:channelId/messages/bulk").delete(
  authenticate(true),
  rateLimit({name: 'message_delete_bulk', expire: 60, requestsLimit: 10 }),
  channelVerification,
  disAllowBlockedUser,
  checkRolePermissions('Admin', permissions.roles.ADMIN, false),
  deleteMessageBulk
)



MessageRouter.use("/", ButtonRouter);
MessageRouter.use("/", ReactionRouter);



export { MessageRouter }