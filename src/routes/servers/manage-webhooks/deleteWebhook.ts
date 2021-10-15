import { NextFunction, Request, Response } from "express-serve-static-core";
import { WebhookModel } from "../../../models/Webhook";
export async function deleteWebhook (req: Request, res: Response, next: NextFunction) {

  const webhookId = req.params.webhook_id;
  const server = req.server;

  const webhook = await WebhookModel.findOne({server: server._id, id: webhookId});


  if (!webhook) {
    return res.status(404).json({message: "Webhook not found."})
  }
  await webhook.deleteOne();

  res.json({message: 'Deleted!'})
}