import { Request, Response } from "express";

export function getChannel(req: Request, res: Response) {
  if (req.channel.server) {
    res.json({
      name: req.channel.name,
      type: req.channel.type,
      channelID: req.channel.channelID,
      server_id: req.channel.server_id,
    });
  } else {
    res.json({
      recipients: req.channel.recipients,
      channelID: req.channel.channelID,
    });
  }
};
