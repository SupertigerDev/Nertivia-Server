import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as Themes from '../../services/Themes';
import themePolicy from '../../policies/ThemePolicies';


export const themeUpdate = (Router: Router) => { 
  Router.route("/:id").patch(
    authenticate(),
    themePolicy.save,
    themeUpdate
  );
  
}
export const route = async (req: Request, res: Response)  => {
  const { name, css, client_version } = req.body;
  const { id } = req.params;

  const theme = await Themes.updateTheme(id, req.user._id, {
    name, css, client_version
  }) .catch(err => {
    res.status(err.statusCode).json({message: err.message});
  })

  if (!theme) return;

  res.json(theme);
};
