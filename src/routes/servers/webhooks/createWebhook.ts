import { NextFunction, Request, Response } from "express-serve-static-core";
import Channels from "../../../models/channels";
import { WebhookModel } from "../../../models/Webhook";
export async function createWebhook (req: Request, res: Response, next: NextFunction) {

  const server = req.server;
  const defaultChannelId = server.default_channel_id;

  const channel = await Channels.findOne({channelID: defaultChannelId}).select("_id");

  if (!channel) {
    return res.status(403).json({message: "Something went wrong. Try again later. (Could not find default server channel)"})
  }


  const webhook = await WebhookModel.create({
    name: "Cool Webhook",
    creator: req.user._id,
    server: server._id,
    channel: channel._id
  })

  res.json({
    name: "Cool Webhook",
    id: webhook.id
  })
}