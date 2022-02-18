import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { channelVerification } from "../../middlewares/ChannelVerification";
import checkRolePermissions from "../../middlewares/checkRolePermissions";
import disAllowBlockedUser from "../../middlewares/disAllowBlockedUser";
import rateLimit from "../../middlewares/rateLimit";
import { USER_TYPING } from "../../ServerEventNames";
const serverChannelPermissions = require('../../middlewares/serverChannelPermissions');
import permissions from "../../utils/rolePermConstants";


export const channelShowTyping = (Router: Router) => {
  Router.route("/:channelId/typing").post(
    authenticate({allowBot: true}),
    rateLimit({name: 'message_typing', expire: 60, requestsLimit: 120 }),
    channelVerification,
    disAllowBlockedUser,
    serverChannelPermissions('send_message', true),
    checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
    route
  );
}

async function route (req: Request, res: Response){
  const { channelId } = req.params;
  res.status(204).end();

  // emit to users
  const io = req.io;

  if (req.channel && req.channel.server) {
    io.in("server:" + req.channel.server.server_id).emit(USER_TYPING, {
      channel_id: channelId,
      user: { id: req.user.id, username: req.user.username }
    });
    return;
  }

  if (req.channel && req.channel.recipients) {
    for (let recipients of req.channel.recipients) {
      io.in(recipients.id).emit(USER_TYPING, {
        channel_id: channelId,
        user: { id: req.user.id, username: req.user.username }
      });
    }
  }
}