import { Router } from "express";

// middlewares
import { authenticate } from "../../../../middlewares/authenticate";
import { channelVerification } from "../../../../middlewares/ChannelVerification";
import disAllowBlockedUser from "../../../../middlewares/disAllowBlockedUser";
import rateLimit from "../../../../middlewares/rateLimit";

//routes
import { addReaction } from "./addReaction";
import { removeReaction } from "./removeReaction";


const ReactionRouter = Router();

ReactionRouter.route("/:channelId/messages/:messageId/reactions").post(
  authenticate(true),
  rateLimit({name: 'message_react', expire: 60, requestsLimit: 120 }),
  channelVerification,
  disAllowBlockedUser,
  addReaction
);


ReactionRouter.route("/:channelId/messages/:messageId/reactions").delete(
  authenticate(true),
  rateLimit({name: 'message_react', expire: 60, requestsLimit: 120 }),
  channelVerification,
  disAllowBlockedUser,
  removeReaction
);

ReactionRouter.route("/:channelId/messages/:messageId/reactions").get(
  authenticate(true),
  rateLimit({name: 'message_react_users', expire: 60, requestsLimit: 120 }),
  channelVerification,
  disAllowBlockedUser,
  require('./getReactedUsers')
);






export { ReactionRouter }