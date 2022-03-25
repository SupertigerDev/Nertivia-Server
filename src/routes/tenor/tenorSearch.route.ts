import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

import {getTenorSearch} from '../../services/Tenor' 

export function tenorSearch (Router: Router) { 
  Router.route("/search/:value").get(
    authenticate(),
    route
  );
}
async function route(req: Request, res: Response) {
  res.json(await getTenorSearch(req.params.value).catch(() => {}))
}