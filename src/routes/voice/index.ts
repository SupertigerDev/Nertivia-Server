import { Router } from "express";
const { authenticate } = require("../../middlewares/authenticate");
import { channelVerify } from "../../middlewares/channelVerify.middleware";

import {rateLimit} from "../../middlewares/rateLimit.middleware";


import {joinCall} from './join'
import {leaveCall} from './leave'

const VoiceRouter = Router();


// Join Call
VoiceRouter.route("/channels/:channelId").post(
  authenticate({allowBot: true}),
  rateLimit({name: 'join_voice', expire: 20, requestsLimit: 15 }),
  channelVerify,
  // checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
  joinCall
);

// leave Call
VoiceRouter.route("/leave").post(
  authenticate({allowBot: true}),
  rateLimit({name: 'leave_voice', expire: 20, requestsLimit: 15 }),
  leaveCall
);




export {VoiceRouter};