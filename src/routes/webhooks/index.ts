import { Router } from "express";
import authenticateWebhook from "../../middlewares/authenticateWebhook";
import ChannelVerification from "../../middlewares/ChannelVerification";
import rateLimit from "../../middlewares/rateLimit";


import {sendMessage} from './sendMessage'

const WebhookRouter = Router();



WebhookRouter.route("/:id/:token").post(
  authenticateWebhook(),
  rateLimit({name: 'webhook_message', expire: 20, requestsLimit: 15}),
  sendMessage
);



export default WebhookRouter;