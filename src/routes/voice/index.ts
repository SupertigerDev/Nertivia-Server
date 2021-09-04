import { Router } from "express";
import authenticate from "../../middlewares/authenticate";
import ChannelVerification from "../../middlewares/ChannelVerification";
import rateLimit from "../../middlewares/rateLimit";


import {joinCall} from './join'

const VoiceRouter = Router();


// Join Call
VoiceRouter.route("/channels/:channelID").post(
  authenticate(true),
  rateLimit({name: 'join_voice', expire: 20, requestsLimit: 15 }),
  ChannelVerification,
  // checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
  joinCall
);




export default VoiceRouter;