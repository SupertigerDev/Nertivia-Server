import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { createTheme } from '../../services/Themes';
import themePolicy from '../../policies/ThemePolicies';

                                                                  
export const themeCreate = (Router: Router) => { 
  Router.route("/").post(
    authenticate(),
    themePolicy.save,
    route
  );
}

export const route = async (req: Request, res: Response)  => {
  const { name, css, client_version } = req.body;

  const theme = await createTheme({
    creator: req.user._id,
    name, 
    css,
    client_version,
  })
  .catch(err => {
    res.status(err.statusCode).json({message: err.message});
  })

  if (!theme) return;

  res.json(theme);
};
