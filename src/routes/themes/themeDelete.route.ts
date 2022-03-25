import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as Themes from '../../services/Themes';

export const themeDelete = (Router: Router) => {
  Router.route("/:id").delete(
    authenticate(),
    route
  );
}

export const route = async (req: Request, res: Response)  => {
  const { id } = req.params;

  const deleted = await Themes.deleteTheme(id, req.user._id).catch(err => {
    res.status(err.statusCode).json({message: err.message});
  })
  if (!deleted) return;
  res.json({message: 'deleted'});
};
