import { Router } from "express";
import authenticate from "../../middlewares/authenticate";
import ChannelVerification from "../../middlewares/ChannelVerification";
import rateLimit from "../../middlewares/rateLimit";


import {joinCall} from './join'

const CallRouter = Router();


// Join Call
CallRouter.route("/channels/:channelID").post(
  authenticate(true),
  rateLimit({name: 'join_call', expire: 20, requestsLimit: 15 }),
  ChannelVerification,
  // checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
  joinCall
);




export default CallRouter;