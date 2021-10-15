import { NextFunction, Request, Response } from "express-serve-static-core";
import Channels from "../../../models/channels";
import { WebhookModel } from "../../../models/Webhook";
export async function getWebhook (req: Request, res: Response, next: NextFunction) {

  const server = req.server;



  const webhooks = await WebhookModel.find({server: server._id}, {_id: 0})
    .select("id name channel creator -_id")
    .populate("channel", "name channelID -_id")
    .populate("creator", "username tag id avatar -_id")
    .sort({_id: -1})
    .lean();

  res.json(webhooks)
}