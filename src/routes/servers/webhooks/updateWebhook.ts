import { NextFunction, Request, Response } from "express-serve-static-core";
import Channels from "../../../models/channels";
import { WebhookModel } from "../../../models/Webhook";

export async function updateWebhook (req: Request, res: Response, next: NextFunction) {

  const webhookId = req.params.webhook_id;
  const server = req.server;
  const {name, channelId} = req.body;


  const webhook = await WebhookModel.findOne({server: server._id, id: webhookId});
  if (!webhook) {
    return res.status(404).json({message: "Webhook not found."})
  }

  const update: any = {};
  if (channelId) {
    const channel = await Channels.findOne({channelID: channelId, server_id: server.server_id});
    if (!channel) {
      return res.status(404).json({message: "channel not found."})
    }
    update.channel = channel._id;
  }
  if (name) {
    update.name = name;
  }

  await webhook.updateOne({$set: update});
  res.json({message: "Updated!"})
}