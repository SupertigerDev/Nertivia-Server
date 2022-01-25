import { Router } from "express";

// middlewares
import { authenticate } from "../../middlewares/authenticate";
import { channelVerification } from "../../middlewares/ChannelVerification";
const rateLimit = require("../../middlewares/rateLimit");

// routes
import {getChannel} from './getChannel';
import {closeChannel} from './closeChannel';
import {openChannel} from './openChannel';
import { MessageRouter } from "./messages/MessageRouter";




const ChannelRouter = Router();



ChannelRouter.route("/:userId").post(
  authenticate(true),
  openChannel
);

ChannelRouter.route("/:channelId").get(
  authenticate(true),
  channelVerification,
  getChannel
);

// close channel
ChannelRouter.route("/:channelId").delete(
  authenticate(true),
  closeChannel,
);


ChannelRouter.use("/", MessageRouter);


export { ChannelRouter }