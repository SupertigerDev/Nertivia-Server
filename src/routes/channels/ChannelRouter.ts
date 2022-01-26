import { Router } from "express";

import {channelGet} from './channelGet';
import {channelClose} from './channelClose';
import {channelOpen} from './channelOpen';
import { messageDelete } from "./messageDelete";
import { messageDeleteBulk } from "./messageDeleteBulk";
import { buttonClicked } from "./buttonClicked";
import { buttonReturned } from "./buttonReturned";
import { reactionAdd } from "./reactionAdd";
import { reactionRemove } from "./reactionRemove";
import { reactionGet } from "./reactionGet";


const ChannelRouter = Router();

channelClose(ChannelRouter);
channelGet(ChannelRouter);
channelOpen(ChannelRouter)

messageDelete(ChannelRouter);
messageDeleteBulk(ChannelRouter);

buttonClicked(ChannelRouter);
buttonReturned(ChannelRouter); // click message button callback (only used by (bot) message creator)

reactionAdd(ChannelRouter)
reactionRemove(ChannelRouter)
reactionGet(ChannelRouter)

export { ChannelRouter }