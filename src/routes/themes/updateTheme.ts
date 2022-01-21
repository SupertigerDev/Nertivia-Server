import { Request, Response } from 'express';
import * as Themes from '../../services/Themes';


export const updateTheme = async (req: Request, res: Response)  => {
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
