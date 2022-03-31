import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { Users } from "../../models/Users";

export function botGetAll (Router: Router) {
  Router.route("/").get(
    authenticate(),
    route
  );
}

async function route(req: Request, res: Response) {
  
  const bots = await Users.find({createdBy: req.user._id}).select("-_id avatar bot created tag id username").lean();

  res.json(bots);

}