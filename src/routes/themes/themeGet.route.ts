import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as Themes from '../../services/Themes';

export const themeGet = (Router: Router) => {
  Router.route("/:id").get(
    authenticate(),
    route
  );
}

const route = async (req: Request, res: Response)  => {
  const { id } = req.params;

  const themes = await Themes.getTheme(id);
  if (!themes) {
    return res.status(404).json({message: "Theme doesn't exist!"})
  }
  res.json(themes);
};

