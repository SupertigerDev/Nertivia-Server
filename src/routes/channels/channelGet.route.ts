import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { channelVerify } from "../../middlewares/channelVerify.middleware";

export function channelGet(Router: Router) {
  Router.route("/:channelId").get(
    authenticate({allowBot: true}),
    channelVerify,
    route
  );
};


async function route(req: Request, res: Response) {
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
}