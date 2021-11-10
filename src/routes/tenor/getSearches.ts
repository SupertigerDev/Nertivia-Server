import { NextFunction, Request, Response } from "express";

import {getTenorSearch} from '../../utils/tenor' 

export default async function getSearches(req: Request, res: Response, next: NextFunction) {
  res.json(await getTenorSearch(req.params.value).catch(() => {}))
}