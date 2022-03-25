import { Router } from "express";

import {voiceJoinCall} from './voiceJoinCall.route'
import {voiceLeaveCall} from './voiceLeaveCall.route'

const VoiceRouter = Router();


voiceJoinCall(VoiceRouter);
voiceLeaveCall(VoiceRouter);


export {VoiceRouter};