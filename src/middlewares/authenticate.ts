import { NextFunction, Request, Response } from "express";
import {decodeToken} from '../utils/JWT';
import * as UserCache from '../cache/User.cache';
interface Options {
  allowBot?: boolean, 
  optional?: boolean,
  skipTerms?: boolean
}



export function authenticate (opts?: Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    const [user, error] = await UserCache.authenticate({
      token,
      userIp: req.userIp,
      allowBot: opts?.allowBot,
      skipTerms: opts?.skipTerms,
    })

    if (error || !user) {
      if (opts?.optional) return next();
      res.status(403).send({message: error})
      return;
    }
    req.user = user;
    next();
  }
}
