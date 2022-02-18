import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { channelVerification } from "../../middlewares/ChannelVerification";

export function channelGet(Router: Router) {
  Router.route("/:channelId").get(
    authenticate({allowBot: true}),
    channelVerification,
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