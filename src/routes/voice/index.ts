import { Router } from "express";
import authenticate from "../../middlewares/authenticate";
import ChannelVerification from "../../middlewares/ChannelVerification";
import rateLimit from "../../middlewares/rateLimit";


import {joinCall} from './join'
import {leaveCall} from './leave'

const VoiceRouter = Router();


// Join Call
VoiceRouter.route("/channels/:channelID").post(
  authenticate(true),
  rateLimit({name: 'join_voice', expire: 20, requestsLimit: 15 }),
  ChannelVerification,
  // checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
  joinCall
);

// leave Call
VoiceRouter.route("/leave").post(
  authenticate(true),
  rateLimit({name: 'leave_voice', expire: 20, requestsLimit: 15 }),
  leaveCall
);




export default VoiceRouter;