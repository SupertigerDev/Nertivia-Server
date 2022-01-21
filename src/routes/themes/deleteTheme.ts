import { Request, Response } from 'express';
import * as Themes from '../../services/Themes';

export const deleteTheme = async (req: Request, res: Response)  => {
  const { id } = req.params;

  const deleted = await Themes.deleteTheme(id, req.user._id).catch(err => {
    res.status(err.statusCode).json({message: err.message});
  })
  if (!deleted) return;

  res.json({message: 'deleted'});
};
