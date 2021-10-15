import { NextFunction, Request, Response } from "express-serve-static-core";
import { WebhookModel } from "../models/Webhook";

const Users = require("../models/users");
const BannedIPs = require("../models/BannedIPs");
const JWT = require("jsonwebtoken");



export default () => {
  return async function (req: Request, res: Response, next: NextFunction) {

    const id = req.params.id;
    const token = process.env.JWT_HEADER + req.params.token;
    // will contain user id
    let decryptedId: string | null = null;

    try {
      decryptedId = JWT.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      req.session?.destroy(() => {});
      return res.status(401).send({
        message: "Invalid Token."
      });
    }
    if (id !== decryptedId) {
      return res.status(401).send({
        message: "Id does not match token."
      });
    }

    if (req.session?.webhook) {
      console.log("webhook session exists :D")
      return next();
    }
    console.log("saving webhook session")
    const webhook = await WebhookModel.findOne({id}, {_id: -1}).select("id name channel").populate("channel", "channelID").lean()
    if (req.session) {
      req.session.webhook = webhook;
    }
    next();
  };
}


