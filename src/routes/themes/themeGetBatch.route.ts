import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { getThemesByCreatorId } from '../../services/Themes';

export const themeGetBatch = (Router: Router) => {  
  Router.route("/").get(
    authenticate(),
    route
  );
}

const route = async (req: Request, res: Response)  => {
  const themes = await getThemesByCreatorId(req.user._id);
  res.json(themes);
};
