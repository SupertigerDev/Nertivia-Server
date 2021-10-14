import { NextFunction, Request, Response } from "express-serve-static-core";
import { WebhookModel } from "../../../models/Webhook";
import JWT from 'jsonwebtoken';
export async function getWebhookToken (req: Request, res: Response, next: NextFunction) {

  const webhookId = req.params.webhook_id;
  const server = req.server;

  const webhook = await WebhookModel.findOne({server: server._id, id: webhookId});

  if (!webhook) {
    return res.status(404).json({message: "Webhook not found."})
  }


  res.send(JWT.sign(webhookId, process.env.JWT_SECRET).split(".").splice(1).join("."))
}