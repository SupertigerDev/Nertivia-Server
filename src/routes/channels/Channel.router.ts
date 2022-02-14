import { Router } from "express";

import {channelGet} from './channelGet.route';
import {channelClose} from './channelClose.route';
import {channelOpen} from './channelOpen.route';
import { messageDelete } from "./messageDelete.route";
import { messageDeleteBulk } from "./messageDeleteBulk.route";
import { buttonClicked } from "./buttonClicked.route";
import { buttonReturned } from "./buttonReturned.route";
import { reactionAdd } from "./reactionAdd.route";
import { reactionRemove } from "./reactionRemove.route";
import { reactionGet } from "./reactionGet.route";
import { channelShowTyping } from "./channelShowTyping.route";
import { messageGet } from "./messageGet.route";
import { messageGetBulk } from "./messageGetBulk.route";
import { messageSend } from "./messageSend.route";
import { messageUpdate } from "./messageUpdate.route";


const ChannelRouter = Router();

channelShowTyping(ChannelRouter)
channelClose(ChannelRouter);
channelGet(ChannelRouter);
channelOpen(ChannelRouter)

messageSend(ChannelRouter)
messageUpdate(ChannelRouter)
messageGet(ChannelRouter);
messageGetBulk(ChannelRouter);
messageDelete(ChannelRouter);
messageDeleteBulk(ChannelRouter);


buttonClicked(ChannelRouter);
buttonReturned(ChannelRouter); // click message button callback (only used by (bot) message creator)

reactionAdd(ChannelRouter);
reactionRemove(ChannelRouter);
reactionGet(ChannelRouter);


export { ChannelRouter }