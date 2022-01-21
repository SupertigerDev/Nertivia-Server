import { Request, Response } from 'express';
import {Themes} from '../../models/Themes';
import { getThemesByCreatorId } from '../../services/Themes';

export const getThemes = async (req: Request, res: Response)  => {
  const themes = await getThemesByCreatorId(req.user._id);
  res.json(themes);
};
