import { NextFunction, Request, Response } from "express";

import {getTenorCategories} from '../../utils/tenor' 

export default async function getCategories(req: Request, res: Response, next: NextFunction) {
  res.json(await getTenorCategories().catch(() => {}))
}