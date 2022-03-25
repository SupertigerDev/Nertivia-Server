import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { Users } from "../../models/Users";

export function botCreate (Router: Router) {
  Router.route("/").post(
    authenticate(),
    rateLimit({name: 'create_bot', expire: 60, requestsLimit: 2 }),
    route
  );
}

async function route(req: Request, res: Response) {
  const botUsername = `${req.user.username}'s Bot`;

  //await Users.deleteMany({createdBy: req.user._id});

  const botCount = await Users.countDocuments({createdBy: req.user._id});
  if (botCount >= 5) {
    res.status(403).json({message: "You can only create 5 bots."})
    return;
  }


  const newBot = await Users.create({ username: botUsername, bot: true, createdBy: req.user._id, ip: req.userIp })
  res.send(newBot)
}