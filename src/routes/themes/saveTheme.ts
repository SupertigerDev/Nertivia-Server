import { Request, Response } from 'express';
import { createTheme } from '../../services/Themes';


export const saveTheme = async (req: Request, res: Response)  => {
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
