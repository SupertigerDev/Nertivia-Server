import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

import {getTenorCategories} from '../../services/Tenor' 


export function tenorCategories (Router: Router) { 
  Router.route("/categories").get(
    authenticate(),
    route
  );
}
async function route(req: Request, res: Response) {
  res.json(await getTenorCategories().catch(() => {}))
}