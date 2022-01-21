import { Request, Response } from 'express';
import * as Themes from '../../services/Themes';

export const getTheme = async (req: Request, res: Response)  => {
  const { id } = req.params;

  const themes = await Themes.getTheme(id);
  if (!themes) {
    return res.status(404).json({message: "Theme doesn't exist!"})
  }
  res.json(themes);
};

